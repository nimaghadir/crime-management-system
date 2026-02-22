from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from accounts.constants import ALL_ROLES

class Command(BaseCommand):
    help = 'Creates the required default roles (Groups) for the LAPD system.'

    def handle(self, *args, **kwargs):
        roles = [
            'System Administrator',
            'Police Chief',
            'Captain',
            'Sergeant',
            'Detective',
            'Police Officer',
            'Cadet',
            'Complainant',
            'Witness',
            'Suspect',
            'Judge',
            'Coroner',
            'Basic User'
        ]

        created_count = 0
        for role_name in ALL_ROLES:
            # get_or_create prevents duplicate errors if run multiple times
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Successfully created role: {role_name}'))
                created_count += 1
            else:
                self.stdout.write(self.style.WARNING(f'Role already exists: {role_name}'))

        self.stdout.write(self.style.SUCCESS(f'\nTotal new roles created: {created_count}'))
