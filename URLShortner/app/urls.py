from django.urls import path
from app import views

urlpatterns = [
    path("shorten/", views.create_url, name="create_url"),
    path("all/", views.get_all_urls, name="get_all_urls"),
    path("search/", views.search_urls, name="search_urls"),
    path("statistics/", views.url_statistics, name="url_statistics"),
    path("details/<str:short_code>/", views.get_url_details, name="get_url_details"),
    path("delete/<str:short_code>/", views.delete_url, name="delete_url"),
    path("update/<str:short_code>/", views.update_url, name="update_url"),
    path("reactivate/<str:short_code>/", views.reactivate_url, name="reactivate_url"),
    path("status/<str:short_code>/", views.update_url_status, name="update_url_status"),
    path("<str:short_code>/", views.redirect_url, name="redirect_url"),
    
]