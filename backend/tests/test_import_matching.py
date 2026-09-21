from backend.services.import_merge import preset_identity, type_identity


def test_preset_identity_distinguishes_field_and_voice():
    base = {"name": "Standard", "target_field": "description", "is_voice": False}
    assert preset_identity(base) == ("Standard", "description", False)
    assert preset_identity({**base, "target_field": "scenario"}) != preset_identity(base)
    assert preset_identity({**base, "is_voice": True}) != preset_identity(base)


def test_type_identity_normalizes_slug():
    assert type_identity({"slug": "  My-Type "}) == "my_type"
