from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Guild, GuildMember
from .serializers import GuildSerializer, GuildMemberSerializer

class GuildListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        guilds = Guild.objects.all().order_by('-points')
        serializer = GuildSerializer(guilds, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = GuildSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            guild = serializer.save()
            # The creator becomes the leader
            GuildMember.objects.create(user=request.user, guild=guild, role='LEADER')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GuildJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        guild = get_object_or_404(Guild, pk=pk)
        if GuildMember.objects.filter(user=request.user, guild=guild).exists():
            return Response({"error": "Bạn đã tham gia hội này rồi."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Optionally limit user to 1 guild or allow multiple
        # Let's allow multiple for now as per "RPG guilds" can be like interest groups
        
        GuildMember.objects.create(user=request.user, guild=guild)
        return Response({"message": f"Bạn đã tham gia hội {guild.name}."}, status=status.HTTP_200_OK)

class GuildLeaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        guild = get_object_or_404(Guild, pk=pk)
        membership = GuildMember.objects.filter(user=request.user, guild=guild).first()
        
        if not membership:
            return Response({"error": "Bạn không phải thành viên hội này."}, status=status.HTTP_400_BAD_REQUEST)
        
        if membership.role == 'LEADER':
            # If leader leaves, maybe pass leadership or delete guild?
            # Simplified: just allow leaving if there are other members, or delete if last
            if guild.members.count() == 1:
                guild.delete()
                return Response({"message": f"Hội {guild.name} đã được giải tán."}, status=status.HTTP_200_OK)
            else:
                # Assign leadership to next person
                next_leader = guild.members.exclude(user=request.user).first()
                next_leader.role = 'LEADER'
                next_leader.save()
        
        membership.delete()
        return Response({"message": f"Bạn đã rời khỏi hội {guild.name}."}, status=status.HTTP_200_OK)

class GuildDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        guild = get_object_or_404(Guild, pk=pk)
        serializer = GuildSerializer(guild, context={'request': request})
        members = GuildMember.objects.filter(guild=guild).order_by('joined_at')
        member_serializer = GuildMemberSerializer(members, many=True)
        
        data = serializer.data
        data['members_list'] = member_serializer.data
        return Response(data)
