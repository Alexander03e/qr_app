from rest_framework import serializers


class AdminEndpointMetricSerializer(serializers.Serializer):
    method = serializers.CharField()
    endpoint = serializers.CharField()
    requests = serializers.IntegerField()
    error_requests = serializers.IntegerField()
    error_rate_percent = serializers.FloatField()
    avg_latency_ms = serializers.FloatField()


class BusinessMetricFieldsMixin(serializers.Serializer):
    total_tickets = serializers.IntegerField()
    active_tickets = serializers.IntegerField()
    processed_tickets = serializers.IntegerField()
    waiting_tickets = serializers.IntegerField()
    called_tickets = serializers.IntegerField()
    in_service_tickets = serializers.IntegerField()
    completed_tickets = serializers.IntegerField()
    skipped_tickets = serializers.IntegerField()
    not_arrived_tickets = serializers.IntegerField()
    left_tickets = serializers.IntegerField()
    removed_tickets = serializers.IntegerField()
    avg_wait_seconds = serializers.FloatField()
    max_wait_seconds = serializers.FloatField()
    avg_service_seconds = serializers.FloatField()
    avg_initial_queue_position = serializers.FloatField()
    sla_wait_under_10_min_percent = serializers.FloatField()
    completion_rate_percent = serializers.FloatField()
    left_rate_percent = serializers.FloatField()
    not_arrived_rate_percent = serializers.FloatField()
    removed_rate_percent = serializers.FloatField()
    load_percent = serializers.FloatField()
    load_per_operator = serializers.FloatField()
    active_operator_count = serializers.IntegerField()
    throughput_per_hour = serializers.FloatField()
    feedback_count = serializers.IntegerField()
    complaints_count = serializers.IntegerField()
    complaint_rate_percent = serializers.FloatField()
    avg_rating = serializers.FloatField()
    rating_count = serializers.IntegerField()


class AdminQueueBusinessMetricSerializer(BusinessMetricFieldsMixin):
    queue_id = serializers.IntegerField()
    queue_name = serializers.CharField()
    branch_id = serializers.IntegerField(allow_null=True)
    branch_name = serializers.CharField(allow_null=True)


class AdminBranchBusinessMetricSerializer(BusinessMetricFieldsMixin):
    branch_id = serializers.IntegerField()
    branch_name = serializers.CharField()
    queue_count = serializers.IntegerField()


class AdminPeakHourMetricSerializer(serializers.Serializer):
    hour = serializers.IntegerField()
    tickets = serializers.IntegerField()


class AdminDailyBusinessMetricSerializer(serializers.Serializer):
    date = serializers.CharField()
    total_tickets = serializers.IntegerField()
    completed_tickets = serializers.IntegerField()
    left_tickets = serializers.IntegerField()
    not_arrived_tickets = serializers.IntegerField()
    avg_wait_seconds = serializers.FloatField()
    avg_service_seconds = serializers.FloatField()


class AdminOperatorBusinessMetricSerializer(BusinessMetricFieldsMixin):
    operator_id = serializers.IntegerField()
    operator_name = serializers.CharField()
    branch_id = serializers.IntegerField(allow_null=True)
    branch_name = serializers.CharField(allow_null=True)
    is_active = serializers.BooleanField()
    queue_count = serializers.IntegerField()


class AdminBusinessMetricsSerializer(BusinessMetricFieldsMixin):
    branches = AdminBranchBusinessMetricSerializer(many=True)
    queues = AdminQueueBusinessMetricSerializer(many=True)
    peak_hours = AdminPeakHourMetricSerializer(many=True)
    daily = AdminDailyBusinessMetricSerializer(many=True)
    operators = AdminOperatorBusinessMetricSerializer(many=True)


class AdminMetricsSerializer(serializers.Serializer):
    company_id = serializers.IntegerField()
    total_requests = serializers.IntegerField()
    error_requests = serializers.IntegerField()
    error_rate_percent = serializers.FloatField()
    avg_latency_ms = serializers.FloatField()
    endpoints = AdminEndpointMetricSerializer(many=True)
    business = AdminBusinessMetricsSerializer()
