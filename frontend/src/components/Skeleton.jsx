function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({ className = "", as: Component = "div" }) {
  return <Component aria-hidden="true" className={cx("skeleton", className)} />;
}

export function SkeletonLines({
  lines = 3,
  className = "",
  lineClassName = "",
  widths = [],
}) {
  return (
    <div className={cx("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={`skeleton-line-${index}`}
          className={cx(
            "h-3",
            widths[index] || (index === lines - 1 ? "w-2/3" : "w-full"),
            lineClassName,
          )}
        />
      ))}
    </div>
  );
}
