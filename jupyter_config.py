# JupyterLab server configuration for Replit's proxied environment.
# Loaded automatically when running: jupyter lab --config=jupyter_config.py

c = get_config()  # noqa: F821 — injected by Jupyter

# Network — bind to all interfaces so Replit's proxy can reach it
c.ServerApp.ip = '0.0.0.0'
c.ServerApp.port = 5000
c.ServerApp.open_browser = False

# Auth — disable for Replit dev environment
c.ServerApp.token = ''
c.ServerApp.password = ''

# Proxy compatibility — allow the Replit iframe proxy
c.ServerApp.allow_origin = '*'
c.ServerApp.allow_remote_access = True
c.ServerApp.disable_check_xsrf = True

# Root dir — serve from workspace root so all notebooks are visible
c.ServerApp.root_dir = '/home/runner/workspace'

c.ContentsManager.allow_hidden = True

# Override security headers so Replit's preview iframe can embed JupyterLab
c.ServerApp.tornado_settings = {
    "headers": {
        "Content-Security-Policy": "frame-ancestors *;",
        "X-Frame-Options": "",
    }
}
