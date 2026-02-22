# financials/serializers.py

from rest_framework import serializers
from .models import RewardTip


class TipCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardTip
        fields = ['case', 'suspect', 'content']


class TipDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardTip
        fields = '__all__'


class TipStatusUpdateSerializer(serializers.Serializer):
    """
    Used for PATCH /tips/{pk}/.
    'status' is the desired new status. Extra fields are conditional.
    """
    status = serializers.ChoiceField(choices=RewardTip.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    reward_amount = serializers.DecimalField(
        max_digits=15, decimal_places=0, required=False
    )

    def validate(self, attrs):
        if attrs.get('status') == RewardTip.Status.CONFIRMED and not attrs.get('reward_amount'):
            raise serializers.ValidationError(
                "reward_amount is required when setting status to CONFIRMED."
            )
        return attrs


class TipLookupSerializer(serializers.ModelSerializer):
    submitter_full_name = serializers.CharField(
        source='submitter.get_full_name', read_only=True
    )
    submitter_national_id = serializers.CharField(
        source='submitter.national_id', read_only=True
    )
    submitter_phone = serializers.CharField(
        source='submitter.phone', read_only=True
    )

    class Meta:
        model = RewardTip
        fields = [
            'id',
            'unique_code',
            'reward_amount',
            'claimed',
            'submitter_full_name',
            'submitter_national_id',
            'submitter_phone',
            'case',
            'submitted_at',
        ]
