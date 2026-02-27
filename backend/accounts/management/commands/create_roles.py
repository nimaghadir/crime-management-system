from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from accounts.constants import ALL_ROLES, POLICE_OFFICER


class Command(BaseCommand):
    help = 'Creates the required default roles (Groups) for the LAPD system.'

    def handle(self, *args, **kwargs):
        created_count = 0
        for role_name in ALL_ROLES:
            # get_or_create prevents duplicate errors if run multiple times
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Successfully created role: {role_name}'))
                created_count += 1
            else:
                self.stdout.write(self.style.WARNING(f'Role already exists: {role_name}'))

        # Legacy cleanup: merge old Patrol Officer role into Police Officer.
        legacy_patrol_group = Group.objects.filter(name="Patrol Officer").first()
        if legacy_patrol_group:
            police_group, _ = Group.objects.get_or_create(name=POLICE_OFFICER)
            moved_users = 0
            for user in legacy_patrol_group.user_set.all():
                user.groups.remove(legacy_patrol_group)
                user.groups.add(police_group)
                moved_users += 1
            legacy_patrol_group.delete()
            self.stdout.write(
                self.style.WARNING(
                    f'Legacy role "Patrol Officer" removed. Reassigned {moved_users} user(s) to "{POLICE_OFFICER}".'
                )
            )

        self.stdout.write(self.style.SUCCESS(f'\nTotal new roles created: {created_count}'))
