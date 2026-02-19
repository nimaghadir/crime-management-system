from rest_framework.response import Response
from rest_framework.views import APIView

from cases.models import Case
from evidence.models import Evidence


class DetectiveBoardSummaryView(APIView):
    def get(self, request):
        assigned_cases = Case.objects.filter(assigned_to=request.user)
        active_statuses = [Case.Status.OPEN, Case.Status.IN_PROGRESS]

        open_assigned_cases = assigned_cases.filter(status__in=active_statuses).count()
        urgent_cases = assigned_cases.filter(
            status__in=active_statuses,
            level=Case.Level.CRITICAL,
        ).count()
        pending_evidence = Evidence.objects.filter(
            case__assigned_to=request.user,
            status=Evidence.Status.PENDING,
        ).count()

        return Response(
            {
                "open_assigned_cases": open_assigned_cases,
                "urgent_cases": urgent_cases,
                "pending_evidence": pending_evidence,
            }
        )
