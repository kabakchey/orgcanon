import { useState } from "react";
import { getOrgapiBaseUrl, setOrgapiBaseUrl } from "../lib/orgapi/config";

export function OrgapiUrlSetting() {
  const [value, setValue] = useState(() => getOrgapiBaseUrl());
  const isSaved = value === getOrgapiBaseUrl();

  return (
    <div className="orgapi-url-setting">
      <label>
        OrgAPI URL:
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
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
