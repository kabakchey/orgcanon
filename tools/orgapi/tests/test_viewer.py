import pytest
from fastapi.testclient import TestClient

from orgapi.app import create_app


@pytest.fixture
def viewer_dir(tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>orgviewer</title>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "app.js").write_text("console.log('orgviewer')")
    return tmp_path


def test_viewer_is_not_served_without_a_viewer_dir():
    response = TestClient(create_app(viewer_dir=None)).get("/ui/")

    assert response.status_code == 404


def test_viewer_index_is_served_under_ui(viewer_dir):
    response = TestClient(create_app(viewer_dir=str(viewer_dir))).get("/ui/")

    assert response.status_code == 200
    assert "<title>orgviewer</title>" in response.text


def test_viewer_assets_are_served_under_ui(viewer_dir):
    response = TestClient(create_app(viewer_dir=str(viewer_dir))).get("/ui/assets/app.js")

    assert response.status_code == 200
    assert response.text == "console.log('orgviewer')"


def test_viewer_dir_without_an_index_fails_at_startup(tmp_path):
    with pytest.raises(RuntimeError, match="VIEWER_DIR"):
        create_app(viewer_dir=str(tmp_path))


def test_viewer_is_not_part_of_the_api_spec(viewer_dir):
    spec = TestClient(create_app(viewer_dir=str(viewer_dir))).get("/spec").json()

    assert not any(path.startswith("/ui") for path in spec["paths"])
