"""Exercise the backend under the package name used by the Docker image."""

import os
import subprocess
import sys
from pathlib import Path


def test_docker_package_name_starts_and_responds_to_healthcheck(tmp_path):
    backend_dir = Path(__file__).resolve().parents[1]
    database_path = (tmp_path / "container.db").as_posix()
    env = os.environ.copy()
    env.pop("PYTHONPATH", None)
    env.update({
        "DATABASE_URL": f"sqlite:///{database_path}",
        "APP_SECRET_FILE": str(tmp_path / "app.secret"),
        "INITIAL_ADMIN_USERNAME": "container-admin",
        "INITIAL_ADMIN_PASSWORD": "container-test-password",
        "OPENROUTER_API_KEY": "",
    })
    # Docker copies backend/ to /srv/app and starts uvicorn app.main:app.
    # Load that same package name without putting the repository root on
    # sys.path, which would mask a mistaken import of backend.* in Alembic.
    script = """
import importlib.util
import sys
from pathlib import Path

backend_dir = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location(
    'app', backend_dir / '__init__.py', submodule_search_locations=[str(backend_dir)]
)
package = importlib.util.module_from_spec(spec)
sys.modules['app'] = package
spec.loader.exec_module(package)

from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
print('container healthcheck OK')
"""
    result = subprocess.run(
        [sys.executable, "-c", script, str(backend_dir)],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "container healthcheck OK" in result.stdout
