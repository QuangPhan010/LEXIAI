import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lexiai.settings')
django.setup()

from api.models import Quest

initial_quests = [
    {
        'title': 'Đăng nhập hàng ngày',
        'description': 'Đăng nhập vào LexiAI mỗi ngày để nhận thưởng XP.',
        'points': 10,
        'quest_type': 'DAILY',
        'key': 'daily_login',
        'icon': 'Calendar'
    },
    {
        'title': 'Phân tích CV đầu tiên',
        'description': 'Tải lên và phân tích CV của bạn để bắt đầu lộ trình sự nghiệp.',
        'points': 50,
        'quest_type': 'ONE_TIME',
        'key': 'upload_cv',
        'icon': 'FileSearch'
    },
    {
        'title': 'Hoàn thành phỏng vấn thử',
        'description': 'Vượt qua một buổi phỏng vấn giả lập với AI Mentor.',
        'points': 100,
        'quest_type': 'ONE_TIME',
        'key': 'complete_interview',
        'icon': 'Bot'
    },
    {
        'title': 'Cập nhật mục tiêu sự nghiệp',
        'description': 'Hoàn thiện hồ sơ với vị trí công việc mong muốn.',
        'points': 20,
        'quest_type': 'ONE_TIME',
        'key': 'update_profile',
        'icon': 'Target'
    },
    {
        'title': 'Trở thành Bậc thầy ATS',
        'description': 'Đạt điểm CV trên 80 điểm trong một lần phân tích.',
        'points': 200,
        'quest_type': 'ACHIEVEMENT',
        'key': 'ats_master',
        'icon': 'ShieldCheck'
    }
]

for q_data in initial_quests:
    quest, created = Quest.objects.update_or_create(
        key=q_data['key'],
        defaults=q_data
    )
    if created:
        print(f"Created quest: {quest.title}")
    else:
        print(f"Updated quest: {quest.title}")

print("Initial quests population complete.")
