from backend.services.security import hash_password, verify_password


def test_password_hash_is_not_reversible_plaintext():
    encoded = hash_password("correct horse battery staple")
    assert encoded != "correct horse battery staple"
    assert verify_password("correct horse battery staple", encoded)
    assert not verify_password("wrong", encoded)
