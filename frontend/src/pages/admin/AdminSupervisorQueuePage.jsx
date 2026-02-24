import { AdminAssignmentQueuePage } from "../../components/admin/AdminAssignmentQueuePage";
import { ADMIN_QUEUE_TYPES } from "../../lib/api";

const assignmentFields = [
  {
    key: "sergeant_id",
    label: "Sergeant",
    roleKeywords: ["sergeant"],
  },
  {
    key: "captain_id",
    label: "Captain",
    roleKeywords: ["captain"],
  },
  {
    key: "chief_id",
    label: "Police Chief",
    roleKeywords: ["chief"],
  },
];

export function AdminSupervisorQueuePage() {
  return (
    <AdminAssignmentQueuePage
      title="Command Chain Assignment Queue"
      description="Police-created cases missing one or more command-chain roles (sergeant, captain, chief)."
      queueType={ADMIN_QUEUE_TYPES.COMMAND_CHAIN_UNASSIGNED}
      assignmentFields={assignmentFields}
      emptyMessage="All active police-created cases already have sergeant, captain, and chief assigned."
    />
  );
}
