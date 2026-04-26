from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
import pdfminer.high_level
import docx2txt
import io
import random
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from .models import AnalysisHistory, EmailOTP, InterviewHistory, UserProfile
from .serializers import UserSerializer, AnalysisHistorySerializer, InterviewHistorySerializer

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Vui lòng cung cấp email."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Kiểm tra email đã tồn tại chưa
        if User.objects.filter(email=email).exists():
            return Response({"error": "Email này đã được đăng ký."}, status=status.HTTP_400_BAD_REQUEST)

        otp_code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timedelta(minutes=5)

        EmailOTP.objects.update_or_create(
            email=email,
            defaults={'code': otp_code, 'expires_at': expires_at}
        )

        # Gửi email
        try:
            send_mail(
                'Mã xác thực LexiAI',
                f'Mã OTP của bạn là: {otp_code}. Mã này có hiệu lực trong 5 phút.',
                None,
                [email],
                fail_silently=False,
            )
            return Response({"message": "Mã OTP đã được gửi đến email của bạn."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Không thể gửi email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Vui lòng cung cấp email."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Kiểm tra email có tồn tại không
        try:
            User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Email này không tồn tại trong hệ thống."}, status=status.HTTP_404_NOT_FOUND)

        otp_code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timedelta(minutes=5)

        EmailOTP.objects.update_or_create(
            email=email,
            defaults={'code': otp_code, 'expires_at': expires_at}
        )

        # Gửi email
        try:
            send_mail(
                'Đặt lại mật khẩu LexiAI',
                f'Mã xác nhận đặt lại mật khẩu của bạn là: {otp_code}. Mã này có hiệu lực trong 5 phút.',
                None,
                [email],
                fail_silently=False,
            )
            return Response({"message": "Mã xác nhận đã được gửi đến email của bạn."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Không thể gửi email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        otp_code = request.data.get('otp')
        new_password = request.data.get('new_password')

        if not email or not otp_code or not new_password:
            return Response({"error": "Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_record = EmailOTP.objects.get(email=email, code=otp_code)
            if otp_record.is_expired():
                return Response({"error": "Mã OTP đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)
        except EmailOTP.DoesNotExist:
            return Response({"error": "Mã OTP không chính xác."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            otp_record.delete()
            return Response({"message": "Mật khẩu đã được thay đổi thành công."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "Không tìm thấy người dùng tương ứng với email này."}, status=status.HTTP_404_NOT_FOUND)

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        otp_code = request.data.get('otp')
        email = request.data.get('email')
        
        if not otp_code or not email:
            return Response({"error": "Thiếu email hoặc mã OTP."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_record = EmailOTP.objects.get(email=email, code=otp_code)
            if otp_record.is_expired():
                return Response({"error": "Mã OTP đã hết hạn."}, status=status.HTTP_400_BAD_REQUEST)
        except EmailOTP.DoesNotExist:
            return Response({"error": "Mã OTP không chính xác."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            otp_record.delete() # Xóa OTP sau khi dùng xong
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': serializer.data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ExtractTextView(APIView):
    # Allow anonymous for now, but can be restricted
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({"error": "Không tìm thấy tệp tải lên."}, status=status.HTTP_400_BAD_REQUEST)
        
        file_obj = request.FILES['file']
        file_name = file_obj.name.lower()
        extracted_text = ""

        try:
            if file_name.endswith('.pdf'):
                with io.BytesIO(file_obj.read()) as stream:
                    extracted_text = pdfminer.high_level.extract_text(stream)
            elif file_name.endswith('.docx'):
                extracted_text = docx2txt.process(file_obj)
            else:
                return Response({"error": "Định dạng tệp không được hỗ trợ."}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                "text": extracted_text,
                "file_name": file_obj.name
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Lỗi xử lý tệp: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            "username": request.user.username,
            "email": request.user.email,
            "points": profile.points,
            "level": profile.level,
            "created_at": profile.created_at
        })

class HistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        histories = AnalysisHistory.objects.filter(user=request.user).order_by('-created_at')
        serializer = AnalysisHistorySerializer(histories, many=True)
        return Response(serializer.data)

    def post(self, request):
        file_name = request.data.get('file_name')
        # Kiểm tra xem người dùng này đã có lịch sử cho file này chưa
        # Nếu rồi thì cập nhật, nếu chưa thì tạo mới
        # Điều này cho phép nhiều tài khoản khác nhau lưu cùng 1 file CV mà không bị trùng lặp/ghi đè lẫn nhau
        instance = AnalysisHistory.objects.filter(user=request.user, file_name=file_name).first()
        
        if instance:
            serializer = AnalysisHistorySerializer(instance, data=request.data, partial=True)
        else:
            serializer = AnalysisHistorySerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)
            # Cộng điểm cho phân tích CV (đảm bảo profile tồn tại)
            profile, _ = UserProfile.objects.get_or_create(user=request.user)
            profile.add_points(20)
            
            res_status = status.HTTP_200_OK if instance else status.HTTP_201_CREATED
            return Response(serializer.data, status=res_status)
        
        print("Serializer errors:", serializer.errors) # Log lỗi ra console server
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class HistoryDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return AnalysisHistory.objects.get(pk=pk, user=user)
        except AnalysisHistory.DoesNotExist:
            return None

    def get(self, request, pk):
        history = self.get_object(pk, request.user)
        if not history:
            return Response({"error": "Không tìm thấy dữ liệu."}, status=status.HTTP_404_NOT_FOUND)
        serializer = AnalysisHistorySerializer(history)
        return Response(serializer.data)

    def delete(self, request, pk):
        history = self.get_object(pk, request.user)
        if not history:
            return Response({"error": "Không tìm thấy dữ liệu."}, status=status.HTTP_404_NOT_FOUND)
        history.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
class InterviewHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        interviews = InterviewHistory.objects.filter(user=request.user).order_by('-created_at')
        serializer = InterviewHistorySerializer(interviews, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = InterviewHistorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            # Cộng điểm cho hoàn thành phỏng vấn
            request.user.profile.add_points(50)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InterviewHistoryDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return InterviewHistory.objects.get(pk=pk, user=user)
        except InterviewHistory.DoesNotExist:
            return None

    def get(self, request, pk):
        interview = self.get_object(pk, request.user)
        if not interview:
            return Response({"error": "Không tìm thấy dữ liệu."}, status=status.HTTP_404_NOT_FOUND)
        serializer = InterviewHistorySerializer(interview)
        return Response(serializer.data)

    def delete(self, request, pk):
        interview = self.get_object(pk, request.user)
        if not interview:
            return Response({"error": "Không tìm thấy dữ liệu."}, status=status.HTTP_404_NOT_FOUND)
        interview.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
