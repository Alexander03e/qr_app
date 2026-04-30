from rest_framework import serializers


class AdminEndpointMetricSerializer(serializers.Serializer):
    method = serializers.CharField()
    endpoint = serializers.CharField()
    requests = serializers.IntegerField()


class AdminQueueBusinessMetricSerializer(serializers.Serializer):
    queue_id = serializers.IntegerField()
    queue_name = serializers.CharField()
    branch_id = serializers.IntegerField(allow_null=True)
    branch_name = serializers.CharField(allow_null=True)
    active_tickets = serializers.IntegerField()
    waiting_tickets = serializers.IntegerField()
    called_tickets = serializers.IntegerField()
    in_service_tickets = serializers.IntegerField()
    completed_tickets = serializers.IntegerField()
    not_arrived_tickets = serializers.IntegerField()
    left_tickets = serializers.IntegerField()
    removed_tickets = serializers.IntegerField()
    avg_wait_seconds = serializers.FloatField()
    avg_service_seconds = serializers.FloatField()


class AdminPeakHourMetricSerializer(serializers.Serializer):
    hour = serializers.IntegerField()
    tickets = serializers.IntegerField()


class AdminOperatorBusinessMetricSerializer(serializers.Serializer):
    operator_id = serializers.IntegerField()
    operator_name = serializers.CharField()
    is_active = serializers.BooleanField()
    queue_count = serializers.IntegerField()
    waiting_tickets = serializers.IntegerField()
    active_tickets = serializers.IntegerField()


class AdminBusinessMetricsSerializer(serializers.Serializer):
    active_tickets = serializers.IntegerField()
    waiting_tickets = serializers.IntegerField()
    called_tickets = serializers.IntegerField()
    in_service_tickets = serializers.IntegerField()
    completed_tickets = serializers.IntegerField()
    not_arrived_tickets = serializers.IntegerField()
    left_tickets = serializers.IntegerField()
    removed_tickets = serializers.IntegerField()
    avg_wait_seconds = serializers.FloatField()
    avg_service_seconds = serializers.FloatField()
    queues = AdminQueueBusinessMetricSerializer(many=True)
    peak_hours = AdminPeakHourMetricSerializer(many=True)
    operators = AdminOperatorBusinessMetricSerializer(many=True)


class AdminMetricsSerializer(serializers.Serializer):
    company_id = serializers.IntegerField()
    total_requests = serializers.IntegerField()
    error_requests = serializers.IntegerField()
    avg_latency_ms = serializers.FloatField()
    endpoints = AdminEndpointMetricSerializer(many=True)
    business = AdminBusinessMetricsSerializer()
