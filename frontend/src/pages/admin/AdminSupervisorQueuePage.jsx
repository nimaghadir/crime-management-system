import { AdminAssignmentQueuePage } from "../../components/admin/AdminAssignmentQueuePage";
import { ADMIN_QUEUE_TYPES } from "../../lib/api";

const assignmentFields = [
  {
    key: "supervisor_id",
    label: "Higher-rank Supervisor",
    roleKeywords: ["sergeant", "captain", "chief", "admin", "supervisor"],
  },
];

export function AdminSupervisorQueuePage() {
  return (
    <AdminAssignmentQueuePage
      title="Supervisor Assignment Queue"
      description="Police-created cases that do not yet have a higher-rank supervisor."
      queueType={ADMIN_QUEUE_TYPES.POLICE_WITHOUT_SUPERVISOR}
      assignmentFields={assignmentFields}
      emptyMessage="No police-created active case is waiting for supervisor assignment."
    />
  );
}
