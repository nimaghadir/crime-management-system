# accounts/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, unique=True)
    national_id = models.CharField(max_length=20, unique=True)

    # Django's AbstractUser already includes username, password, 
    # first_name, last_name, and relationships to Group (for roles).

    def __str__(self):
        return self.username
