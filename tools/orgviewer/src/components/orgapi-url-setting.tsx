import { useState } from "react";
import { getOrgapiBaseUrl, setOrgapiBaseUrl } from "../lib/orgapi/config";

export function OrgapiUrlSetting() {
  const [value, setValue] = useState(() => getOrgapiBaseUrl());
  const isSaved = value === getOrgapiBaseUrl();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        OrgAPI URL:
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          style={{ width: 220 }}
        />
      </label>
      <button
        type="button"
        disabled={isSaved}
        onClick={() => {
          setOrgapiBaseUrl(value);
          window.location.reload();
        }}
      >
        Save &amp; reload
      </button>
    </div>
  );
}
