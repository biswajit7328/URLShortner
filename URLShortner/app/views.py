
from django.shortcuts import get_object_or_404, redirect
from django.db.models import F,Avg

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from app.models import ShortURL
from app.serializers import ShortURLSerializer
from app.services import create_short_url
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.http import JsonResponse
# 1. Create a Short URL

@api_view(["POST"])
def create_url(request):
    serializer = ShortURLSerializer(data=request.data)

    if serializer.is_valid():

        original_url = serializer.validated_data["original_url"]
        custom_code = serializer.validated_data.get("custom_code")
        expires_at = serializer.validated_data.get("expires_at")
        is_active = serializer.validated_data.get("is_active", True)

        # Check for duplicate original URL
        if ShortURL.objects.filter(original_url=original_url).exists():
            return Response(
                {"error": "This URL already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check custom code
        if custom_code:
            if ShortURL.objects.filter(short_code=custom_code).exists():
                return Response(
                    {"error": "This custom code is already taken."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            url = ShortURL.objects.create(
                original_url=original_url,
                short_code=custom_code,
                expires_at=expires_at,
                is_active=is_active
            )

        else:
            url = create_short_url(original_url)

            url.expires_at = expires_at
            url.is_active = is_active

            url.save(update_fields=["expires_at", "is_active"])

        response_serializer = ShortURLSerializer(url)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )
# 2. Redirect to Original URL
# 2. Redirect to Original URL
def redirect_url(request, short_code):
    url = get_object_or_404(
        ShortURL,
        short_code=short_code,
        is_active=True
    )

    # Check URL expiration
    if url.expires_at and url.expires_at <= timezone.now():
        return JsonResponse(
    {
        "error": "This short URL has expired."
    },
    status=410
)

    # Increment click count
    ShortURL.objects.filter(id=url.id).update(
        clicks=F("clicks") + 1
    )

    return redirect(url.original_url)

    # Increment click count
    ShortURL.objects.filter(id=url.id).update(
        clicks=F("clicks") + 1
    )

    return redirect(url.original_url)


# 3. Get Short URL Details
@api_view(["GET"])
def get_url_details(request, short_code):
    url = get_object_or_404(
        ShortURL,
        short_code=short_code
    )

    serializer = ShortURLSerializer(url)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )

# 4. Get All Short URLs with Pagination
@api_view(["GET"])
def get_all_urls(request):
    urls = ShortURL.objects.all().order_by("-created_at")

    paginator = PageNumberPagination()
    paginator.page_size = 5

    paginated_urls = paginator.paginate_queryset(
        urls,
        request
    )

    serializer = ShortURLSerializer(
        paginated_urls,
        many=True
    )

    return paginator.get_paginated_response(
        serializer.data
    )


# 5. Delete (Deactivate) a Short URL
@api_view(['DELETE'])
def delete_url(request, short_code):
    try:
        url = ShortURL.objects.get(short_code=short_code)
        url.delete()

        return Response(
            {"message": "Short URL permanently deleted."},
            status=status.HTTP_200_OK
        )

    except ShortURL.DoesNotExist:
        return Response(
            {"error": "Short URL not found."},
            status=status.HTTP_404_NOT_FOUND
        )



# 6. Update Original URL
@api_view(["PATCH"])
def update_url(request, short_code):
    url = get_object_or_404(
        ShortURL,
        short_code=short_code,
        is_active=True
    )

    serializer = ShortURLSerializer(
        url,
        data=request.data,
        partial=True
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


# 7. Reactivate a Short URL
@api_view(["PATCH"])
def reactivate_url(request, short_code):
    url = get_object_or_404(
        ShortURL,
        short_code=short_code,
        is_active=False
    )

    url.is_active = True
    url.save(update_fields=["is_active"])

    return Response(
        {
            "message": "Short URL reactivated successfully",
            "short_code": url.short_code,
            "is_active": url.is_active
        },
        status=status.HTTP_200_OK
    )

# 8. Search Short URLs
@api_view(["GET"])
def search_urls(request):
    query = request.query_params.get("q", "")

    urls = ShortURL.objects.filter(
        original_url__icontains=query
    ) | ShortURL.objects.filter(
        short_code__icontains=query
    )

    serializer = ShortURLSerializer(urls, many=True)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK
    )


# 9. URL Statistics

# 11. URL Statistics
@api_view(["GET"])
def url_statistics(request):

    # Total number of URLs
    total_urls = ShortURL.objects.count()

    # Active URLs
    active_urls = ShortURL.objects.filter(
        is_active=True
    ).count()

    # Inactive URLs
    inactive_urls = ShortURL.objects.filter(
        is_active=False
    ).count()

    # Total clicks across all URLs
    total_clicks = sum(
        ShortURL.objects.values_list("clicks", flat=True)
    )

    # Average clicks per URL
    average_clicks = ShortURL.objects.aggregate(
        average=Avg("clicks")
    )["average"] or 0

    # Clicks per individual URL
    clicks_per_url = ShortURL.objects.values(
        "short_code",
        "original_url",
        "clicks"
    ).order_by("-clicks")

    # Most clicked URL
    most_clicked_url = ShortURL.objects.order_by(
        "-clicks"
    ).first()

    # API Response
    return Response(
        {
            "total_urls": total_urls,

            "active_urls": active_urls,

            "inactive_urls": inactive_urls,

            "total_clicks": total_clicks,

            "average_clicks": round(average_clicks, 2),

            "clicks_per_url": list(clicks_per_url),

            "active_inactive_summary": {
                "active": active_urls,
                "inactive": inactive_urls
            },

            "most_clicked_url": (
                {
                    "short_code": most_clicked_url.short_code,
                    "original_url": most_clicked_url.original_url,
                    "clicks": most_clicked_url.clicks
                }
                if most_clicked_url else None
            )
        },
        status=status.HTTP_200_OK
    )

# 10. Update URL Status
@api_view(["PATCH"])
def update_url_status(request, short_code):

    url = get_object_or_404(
        ShortURL,
        short_code=short_code
    )

    is_active = request.data.get("is_active")

    if is_active is None:
        return Response(
            {"error": "Please provide is_active."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(is_active, bool):
        return Response(
            {"error": "is_active must be true or false."},
            status=status.HTTP_400_BAD_REQUEST
        )

    url.is_active = is_active
    url.save(update_fields=["is_active"])

    return Response(
        {
            "message": "URL status updated successfully.",
            "short_code": url.short_code,
            "is_active": url.is_active
        },
        status=status.HTTP_200_OK
    )