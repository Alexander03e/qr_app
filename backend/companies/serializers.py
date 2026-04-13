from rest_framework import serializers

from companies.models import Branch, Company


class AdminCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'


class AdminBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'

    def validate_work_schedule_json(self, value):
        if value is None:
            return {}
        return value