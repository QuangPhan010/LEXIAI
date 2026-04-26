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
from .models import AnalysisHistory, EmailOTP, InterviewHistory, UserProfile, Quest, UserQuest
from .serializers import UserSerializer, AnalysisHistorySerializer, InterviewHistorySerializer, QuestSerializer, UserQuestSerializer

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
                "text": extracted_text.replace('\x00', ''),
                "file_name": file_obj.name
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Lỗi xử lý tệp: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import UserProfile
        from .serializers import UserProfileSerializer
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # Check for daily login quest
        today = timezone.now().date()
        if profile.last_login_date != today:
            profile.last_login_date = today
            profile.save()
            
            # Award daily login points if quest exists
            daily_quest = Quest.objects.filter(key='daily_login').first()
            if daily_quest:
                # Reset UserQuest for a new day
                UserQuest.objects.filter(user=request.user, quest=daily_quest).delete()
                UserQuest.objects.create(user=request.user, quest=daily_quest, is_claimed=True) # Auto-claimed for daily
                profile.add_points(daily_quest.points)
        
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        from .models import UserProfile
        from .serializers import UserProfileSerializer
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            instance = serializer.save()
            
            # Hoàn thành nhiệm vụ 'update_profile' nếu có mục tiêu
            if instance.target_role:
                from .models import Quest, UserQuest
                quest = Quest.objects.filter(key='update_profile').first()
                if quest:
                    UserQuest.objects.get_or_create(user=request.user, quest=quest)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            
            # Hoàn thành nhiệm vụ 'upload_cv'
            cv_quest = Quest.objects.filter(key='upload_cv').first()
            if cv_quest:
                UserQuest.objects.get_or_create(user=request.user, quest=cv_quest)
            
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
            
            # Hoàn thành nhiệm vụ 'complete_interview'
            int_quest = Quest.objects.filter(key='complete_interview').first()
            if int_quest:
                UserQuest.objects.get_or_create(user=request.user, quest=int_quest)
            
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

class QuestListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        
        # Check for daily login reward automatically
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        daily_quest = Quest.objects.filter(key='daily_login').first()
        
        # Kiểm tra xem đã có bản ghi hoàn thành nhiệm vụ ngày hôm nay chưa
        has_daily_today = False
        if daily_quest:
            uq = UserQuest.objects.filter(user=request.user, quest=daily_quest).first()
            if uq and uq.completed_at.date() == today:
                has_daily_today = True
        
        if not has_daily_today:
            profile.last_login_date = today
            profile.save()
            
            if daily_quest:
                # Xóa bản ghi cũ (của ngày trước) để tạo bản ghi mới cho hôm nay
                UserQuest.objects.filter(user=request.user, quest=daily_quest).delete()
                UserQuest.objects.create(user=request.user, quest=daily_quest, is_claimed=True)
                profile.add_points(daily_quest.points)

        quests = Quest.objects.all()
        # Get all user quests
        user_quests_records = UserQuest.objects.filter(user=request.user)
        user_quests_map = {uq.quest_id: uq for uq in user_quests_records}
        
        serializer = QuestSerializer(quests, many=True)
        data = serializer.data
        
        for q in data:
            quest_id = q['id']
            quest_type = q['quest_type']
            
            if quest_id in user_quests_map:
                uq = user_quests_map[quest_id]
                
                if quest_type == 'DAILY':
                    # For daily quests, check if completed today
                    is_today = uq.completed_at.date() == today
                    q['is_completed'] = is_today
                    q['is_claimed'] = uq.is_claimed if is_today else False
                else:
                    q['is_completed'] = True
                    q['is_claimed'] = uq.is_claimed
            else:
                q['is_completed'] = False
                q['is_claimed'] = False
            
        return Response(data)

class ClaimQuestRewardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            quest = Quest.objects.get(pk=pk)
            user_quest = UserQuest.objects.get(user=request.user, quest=quest)
            
            if user_quest.is_claimed:
                return Response({"error": "Bạn đã nhận phần thưởng này rồi."}, status=status.HTTP_400_BAD_REQUEST)
            
            user_quest.is_claimed = True
            user_quest.save()
            
            # Award points
            request.user.profile.add_points(quest.points)
            
            return Response({
                "message": f"Chúc mừng! Bạn đã nhận được {quest.points} XP.",
                "points": quest.points,
                "new_total": request.user.profile.points
            })
            
        except Quest.DoesNotExist:
            return Response({"error": "Nhiệm vụ không tồn tại."}, status=status.HTTP_404_NOT_FOUND)
        except UserQuest.DoesNotExist:
            return Response({"error": "Bạn chưa hoàn thành nhiệm vụ này."}, status=status.HTTP_400_BAD_REQUEST)
