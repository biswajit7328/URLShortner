from rest_framework import serializers

from app.models import ShortURL


class ShortURLSerializer(serializers.ModelSerializer):

    custom_code = serializers.CharField(
        required=False,
        write_only=True,
        max_length=20
    )

    class Meta:
        model = ShortURL
        fields = [
            "id",
            "original_url",
            "short_code",
            "custom_code",
            "created_at",
            "clicks",
            "is_active",
            "expires_at",]

        read_only_fields = [
            "id",
            "short_code",
            "created_at",
            "clicks",
            
            
        ]

    def validate_custom_code(self, value):
        if not value.isalnum():
            raise serializers.ValidationError(
                "Custom code must contain only letters and numbers."
            )

        return value