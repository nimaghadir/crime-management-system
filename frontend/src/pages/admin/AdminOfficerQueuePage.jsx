import { AdminAssignmentQueuePage } from "../../components/admin/AdminAssignmentQueuePage";
import { ADMIN_QUEUE_TYPES } from "../../lib/api";

const assignmentFields = [
  {
    key: "officer_id",
    label: "Police Officer",
    roleKeywords: ["officer", "patrol"],
  },
];

export function AdminOfficerQueuePage() {
  return (
    <AdminAssignmentQueuePage
      title="Officer Assignment Queue"
      description="Cases that still need a responsible police officer."
      queueType={ADMIN_QUEUE_TYPES.OFFICER_UNASSIGNED}
      assignmentFields={assignmentFields}
      emptyMessage="All active cases already have an officer assigned."
    />
  );
}
