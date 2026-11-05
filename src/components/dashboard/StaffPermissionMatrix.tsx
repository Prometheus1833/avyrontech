import { STAFF_PERMISSIONS, staffPermissionIssues } from "@/shared/staffAccess";
export function StaffPermissionMatrix({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const groups = [...new Set(STAFF_PERMISSIONS.map((p) => p[1]))];
  return (
    <div className="agency-permissions">
      {groups.map((group) => (
        <details key={group} open className="agency-permission-group">
          <summary>
            {group}
            <span>
              {
                STAFF_PERMISSIONS.filter(
                  (p) => p[1] === group && value.includes(p[0]),
                ).length
              }{" "}
              selectate
            </span>
          </summary>
          <div>
            {STAFF_PERMISSIONS.filter((p) => p[1] === group).map(
              ([key, , label, description]) => (
                <label className="agency-permission" key={key}>
                  <input
                    type="checkbox"
                    checked={value.includes(key)}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...new Set([...value, key])]
                          : value.filter((k) => k !== key),
                      )
                    }
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                </label>
              ),
            )}
          </div>
        </details>
      ))}
      {staffPermissionIssues(value).length > 0 && (
        <div role="alert" className="agency-notice">
          {staffPermissionIssues(value).map((issue) => (
            <p key={issue}>{issue}</p>
          ))}
        </div>
      )}
    </div>
  );
}
export function StaffScopeList({
  title,
  items,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  items: { id: string; name: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="agency-scope" disabled={disabled}>
      <legend>
        {title} <span>{value.length}</span>
      </legend>
      {!items.length ? (
        <p className="agency-muted">Nu există înregistrări disponibile.</p>
      ) : (
        <div className="agency-scope-list">
          {items.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={value.includes(item.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...new Set([...value, item.id])]
                      : value.filter((id) => id !== item.id),
                  )
                }
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
