import json

from django.http import HttpResponse
from django.urls import reverse
from django.views import View


class SwaggerUIView(View):
    schema_url_name = "api-schema"

    def get(self, request):
        schema_url = request.build_absolute_uri(reverse(self.schema_url_name))
        swagger_bundle_url = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        swagger_css_url = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"

        html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Caseflow API Docs</title>
    <link rel="stylesheet" href="{swagger_css_url}" />
    <style>
      body {{
        margin: 0;
        background: #fafafa;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }}
      .topbar {{
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 10px 14px;
        background: #111827;
        color: #f9fafb;
      }}
      .topbar input {{
        width: 420px;
        max-width: calc(100vw - 230px);
        border: 1px solid #374151;
        border-radius: 6px;
        padding: 8px 10px;
        background: #1f2937;
        color: #f9fafb;
      }}
      .topbar button {{
        border: 0;
        border-radius: 6px;
        padding: 8px 10px;
        cursor: pointer;
        background: #2563eb;
        color: #fff;
      }}
    </style>
  </head>
  <body>
    <div class="topbar">
      <strong>Bearer Token</strong>
      <input id="token" placeholder="Paste JWT access_token for protected endpoints" />
      <button id="save-token">Save</button>
    </div>
    <div id="swagger-ui"></div>
    <script src="{swagger_bundle_url}"></script>
    <script>
      const tokenInput = document.getElementById("token");
      const saveButton = document.getElementById("save-token");
      tokenInput.value = localStorage.getItem("caseflow_swagger_token") || "";

      saveButton.addEventListener("click", () => {{
        localStorage.setItem("caseflow_swagger_token", tokenInput.value.trim());
      }});

      window.ui = SwaggerUIBundle({{
        url: {json.dumps(schema_url)},
        dom_id: "#swagger-ui",
        deepLinking: true,
        defaultModelsExpandDepth: 1,
        requestInterceptor: (req) => {{
          const token = (localStorage.getItem("caseflow_swagger_token") || "").trim();
          if (token) {{
            req.headers.Authorization = `Bearer ${{token}}`;
          }}
          return req;
        }},
      }});
    </script>
  </body>
</html>
"""
        return HttpResponse(html)
