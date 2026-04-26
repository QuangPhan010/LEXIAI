from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import ExtractTextView, RegisterView, HistoryView, HistoryDetailView, SendOTPView, InterviewHistoryView, InterviewHistoryDetailView, ProfileView, ForgotPasswordView, ResetPasswordView, QuestListView, ClaimQuestRewardView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('cv/extract-text/', ExtractTextView.as_view(), name='extract-text'),
    path('history/', HistoryView.as_view(), name='history-list'),
    path('history/<int:pk>/', HistoryDetailView.as_view(), name='history-detail'),
    path('interviews/', InterviewHistoryView.as_view(), name='interview-list'),
    path('interviews/<int:pk>/', InterviewHistoryDetailView.as_view(), name='interview-detail'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('quests/', QuestListView.as_view(), name='quest-list'),
    path('quests/<int:pk>/claim/', ClaimQuestRewardView.as_view(), name='quest-claim'),
]
