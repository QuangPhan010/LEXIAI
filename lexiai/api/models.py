from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    points = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    bio = models.TextField(null=True, blank=True)
    target_role = models.CharField(max_length=255, null=True, blank=True)
    industry = models.CharField(max_length=255, null=True, blank=True)
    skills = models.JSONField(default=list, blank=True)
    experience_level = models.CharField(max_length=50, null=True, blank=True)
    social_links = models.JSONField(default=dict, blank=True) # {github: '', linkedin: '', website: ''}
    achievements = models.JSONField(default=list, blank=True) # ['ats_master', 'interview_expert']
    created_at = models.DateTimeField(auto_now_add=True)

    def add_points(self, amount):
        self.points += amount
        # Logic thăng cấp đơn giản: mỗi 100 điểm lên 1 cấp
        self.level = (self.points // 100) + 1
        self.save()

    def __str__(self):
        return f"{self.user.username} - Level {self.level} ({self.points} pts)"

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

class AnalysisHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analyses')
    file_name = models.CharField(max_length=500)
    score = models.IntegerField(default=0)
    breakdown = models.JSONField(null=True, blank=True) # Stores breakdown like {ats: 80, structure: 70, ...}
    issues = models.JSONField(null=True, blank=True)    # Stores the list of issues and suggestions
    radar_data = models.JSONField(null=True, blank=True) # Stores chart data
    skill_gaps = models.JSONField(null=True, blank=True) # Stores skill gaps analysis
    ats_keywords = models.JSONField(null=True, blank=True) # Stores ATS keywords
    extracted_text = models.TextField(null=True, blank=True) # Stores original text for editor
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.file_name} ({self.score})"

class EmailOTP(models.Model):
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.email} - {self.code}"
        
class InterviewHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interviews')
    messages = models.JSONField()
    evaluation = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interview {self.id} - {self.user.username} ({self.created_at})"
