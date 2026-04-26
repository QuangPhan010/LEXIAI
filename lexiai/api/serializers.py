from rest_framework import serializers
from django.contrib.auth.models import User
from .models import AnalysisHistory, InterviewHistory, UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('user', 'points', 'level', 'created_at')

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'profile')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

class AnalysisHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisHistory
        fields = '__all__'
        read_only_fields = ('user', 'created_at')

class InterviewHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewHistory
        fields = '__all__'
        read_only_fields = ('user', 'created_at')
