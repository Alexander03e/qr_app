from rest_framework import serializers


class AdminMetricsSerializer(serializers.Serializer):
    company_id = serializers.IntegerField()
    total_requests = serializers.IntegerField()
    error_requests = serializers.IntegerField()
    avg_latency_ms = serializers.FloatField()
    endpoints = serializers.ListField(child=serializers.DictField())
