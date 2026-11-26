
from django.db import transaction

from app.models import ShortURL
from app.utils import generate_short_code


@transaction.atomic
def create_short_url(original_url):
    # First, create a database record.
    url = ShortURL.objects.create(
        original_url=original_url,
        short_code=""
    )

    # Generate a Base62 code using the database ID.
    url.short_code = generate_short_code(url.id)

    # Save the generated code.
    url.save(update_fields=["short_code"])

    return url
