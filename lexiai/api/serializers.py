from rest_framework import serializers
from django.contrib.auth.models import User
from .models import AnalysisHistory, InterviewHistory, UserProfile, Quest, UserQuest, Guild, GuildMember

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

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

    def to_internal_value(self, data):
        # Đảm bảo loại bỏ ký tự null (\x00) khỏi tất cả các trường dữ liệu
        # PostgreSQL không cho phép lưu ký tự này trong Text/JSON
        def clean_nulls(item):
            if isinstance(item, str):
                return item.replace('\x00', '')
            if isinstance(item, list):
                return [clean_nulls(i) for i in item]
            if isinstance(item, dict):
                return {k: clean_nulls(v) for k, v in item.items()}
            return item
        
        cleaned_data = clean_nulls(data)
        return super().to_internal_value(cleaned_data)

class InterviewHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewHistory
        fields = '__all__'
        read_only_fields = ('user', 'created_at')

    def to_internal_value(self, data):
        def clean_nulls(item):
            if isinstance(item, str):
                return item.replace('\x00', '')
            if isinstance(item, list):
                return [clean_nulls(i) for i in item]
            if isinstance(item, dict):
                return {k: clean_nulls(v) for k, v in item.items()}
            return item
        
        cleaned_data = clean_nulls(data)
        return super().to_internal_value(cleaned_data)

class QuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quest
        fields = '__all__'

class UserQuestSerializer(serializers.ModelSerializer):
    quest = QuestSerializer(read_only=True)
    
    class Meta:
        model = UserQuest
        fields = '__all__'
        read_only_fields = ('user', 'completed_at')

class GuildMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = GuildMember
        fields = '__all__'
        read_only_fields = ('joined_at',)

class GuildSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    is_joined = serializers.SerializerMethodField()
    
    class Meta:
        model = Guild
        fields = '__all__'
        read_only_fields = ('points', 'created_at')

    def get_is_joined(self, obj):
        user = self.context.get('request').user
        if user.is_authenticated:
            return GuildMember.objects.filter(user=user, guild=obj).exists()
        return False
