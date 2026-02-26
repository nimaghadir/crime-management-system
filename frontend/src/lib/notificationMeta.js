export function getNotificationMeta(item) {
  const caseId = Number(item?.related_case_id) || null;
  const link = String(item?.target_path || item?.link || "").trim();
  if (caseId) {
    return { label: `Case #${caseId}`, link: link || `/cases/${caseId}` };
  }
  if (link) {
    return { label: "Open notification target", link };
  }
  return { label: "", link: "" };
}

