import { Link } from "react-router-dom";

const QUEUE_CARDS = [
  {
    title: "Intern Assignment",
    description: "Cases not sent to a cadet/intern yet.",
    to: "/admin/case-queues/intern",
  },
  {
    title: "Officer Assignment",
    description: "Cases that still do not have a police officer.",
    to: "/admin/case-queues/officer",
  },
  {
    title: "Supervisor Assignment",
    description: "Police-created cases waiting for higher-rank supervisor assignment.",
    to: "/admin/case-queues/supervisor",
  },
  {
    title: "Detective/Judge Assignment",
    description: "Cases missing detective or judge assignment.",
    to: "/admin/case-queues/specialists",
  },
];

export function AdminCaseQueuesHomePage() {
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-brass">Case Assignment Queues</h1>
          <p className="mt-1 text-zinc-400">
            Each queue is isolated on its own page to keep admin workflow clean and focused.
          </p>
        </div>
        <Link to="/admin/console" className="btn-secondary">
          Back to Admin Console
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {QUEUE_CARDS.map((item) => (
          <article key={item.to} className="card p-4">
            <p className="font-semibold text-paper">{item.title}</p>
            <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
            <Link to={item.to} className="btn-primary mt-4 inline-block">
              Open Queue
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
