from rest_framework import serializers

from users.models import Role, User
from queues.models import Queue


class OperatorLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class OperatorProfileSerializer(serializers.ModelSerializer):
    queue_ids = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'fullname', 'email', 'role', 'branch', 'company', 'preferred_language', 'queue_ids')

    def get_queue_ids(self, obj: User):
        return list(obj.assigned_queues.values_list('id', flat=True))


class OperatorLoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    expires_at = serializers.DateTimeField()
    operator = OperatorProfileSerializer()


class OperatorSessionSerializer(serializers.Serializer):
    operator = OperatorProfileSerializer()


class OperatorQueueActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['complete', 'return'])
    
    
class OperatorLogoutResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'fullname', 'email', 'role', 'branch', 'company', 'preferred_language')


class AdminLoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    expires_at = serializers.DateTimeField()
    admin = AdminProfileSerializer()


class AdminSessionSerializer(serializers.Serializer):
    admin = AdminProfileSerializer()


class AdminSettingsSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = ('fullname', 'email', 'password', 'preferred_language')


class OperatorSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('preferred_language',)


class AdminOperatorSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    queue_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    queues = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'fullname',
            'email',
            'password',
            'role',
            'is_active',
            'company',
            'branch',
            'preferred_language',
            'queue_ids',
            'queues',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'role', 'company', 'created_at', 'updated_at')

    def validate_branch(self, value):
        admin_user: User = self.context['admin_user']

        if value is None:
            return value

        if admin_user.company_id and value.company_id != admin_user.company_id:
            raise serializers.ValidationError('Нельзя назначать филиал другой компании.')

        return value

    def validate_queue_ids(self, value):
        admin_user: User = self.context['admin_user']
        if not value:
            return []

        queues = Queue.objects.select_related('branch').filter(id__in=value)
        if queues.count() != len(set(value)):
            raise serializers.ValidationError('Часть очередей не найдена.')

        for queue in queues:
            if admin_user.company_id and queue.branch and queue.branch.company_id != admin_user.company_id:
                raise serializers.ValidationError('Нельзя назначать очереди другой компании.')

        return list(dict.fromkeys(value))

    def get_queues(self, obj: User):
        return [
            {
                'id': item.id,
                'name': item.name,
            }
            for item in obj.assigned_queues.all().order_by('id')
        ]
