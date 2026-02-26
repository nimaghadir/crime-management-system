from django.urls import path
from .views import (
    AdminConsoleSummaryView,
    RoleListCreateView,
    RoleDeleteView,
    UserListView,
    UserDetailManageView,
    AssignUserRoleView,
    CaseQueueView,
    CaseAssignmentView,
    AdminCaseDeleteView,
)

urlpatterns = [
    path('console-summary/', AdminConsoleSummaryView.as_view(), name='admin-console-summary'),

    path('roles/', RoleListCreateView.as_view(), name='roles-list-create'),
    path('roles/<int:role_id>/', RoleDeleteView.as_view(), name='role-delete'),

    path('users/', UserListView.as_view(), name='users-list'),
    path('users/<int:user_id>/', UserDetailManageView.as_view(), name='user-detail-manage'),
    path('users/<int:user_id>/assign-role/', AssignUserRoleView.as_view(), name='assign-role'),
    path("admin/case-queues/<str:queue_type>/", CaseQueueView.as_view(), name="admin-case-queues"),
    path("admin/case-assignments/<int:case_id>/", CaseAssignmentView.as_view(), name="admin-case-assignments"),
    path("admin/cases/<int:case_id>/", AdminCaseDeleteView.as_view(), name="admin-case-delete"),
]
