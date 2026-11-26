
from django.db import models


class ShortURL(models.Model):
    original_url = models.URLField(max_length=2048)

    short_code = models.CharField( max_length=20,unique=True)
    

    created_at = models.DateTimeField(auto_now_add=True)

    clicks = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True,blank=True)


    def __str__(self):
        return self.short_code
