"""accounts, ownership, persistent generation jobs and avatars"""
from alembic import op
import sqlalchemy as sa

revision = "20260921_01"
down_revision = None
branch_labels = None
depends_on = None

def _has_table(bind, name):
    return name in sa.inspect(bind).get_table_names()

def _add_owner(bind, table):
    inspector = sa.inspect(bind)
    if not _has_table(bind, table):
        return
    if "user_id" not in {c["name"] for c in inspector.get_columns(table)}:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
            batch.create_index(f"ix_{table}_user_id", ["user_id"])
            batch.create_foreign_key(f"fk_{table}_user_id_user", "user", ["user_id"], ["id"])

def upgrade():
    bind = op.get_bind()
    if not _has_table(bind, "user"):
        op.create_table("user", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("username", sa.String(), nullable=False, unique=True), sa.Column("password_hash", sa.String(), nullable=False), sa.Column("role", sa.String(), nullable=False, server_default="user"), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False))
        op.create_index("ix_user_username", "user", ["username"], unique=True)
    if not _has_table(bind, "usersettings"):
        op.create_table("usersettings", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False, unique=True), sa.Column("api_key_encrypted", sa.String(), nullable=False, server_default=""), sa.Column("default_model", sa.String(), nullable=False), sa.Column("preferred_provider", sa.String(), nullable=False, server_default=""), sa.Column("max_tokens", sa.Integer(), nullable=False), sa.Column("temperature", sa.Float(), nullable=False), sa.Column("top_p", sa.Float(), nullable=False), sa.Column("repetition_penalty", sa.Float(), nullable=False), sa.Column("include_reasoning", sa.Boolean(), nullable=False), sa.Column("reasoning_effort", sa.String(), nullable=False), sa.Column("field_max_tokens_json", sa.String(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False))
        op.create_index("ix_usersettings_user_id", "usersettings", ["user_id"], unique=True)
    if not _has_table(bind, "authsession"):
        op.create_table("authsession", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False), sa.Column("token_hash", sa.String(), nullable=False, unique=True), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("expires_at", sa.DateTime(), nullable=False), sa.Column("revoked_at", sa.DateTime(), nullable=True))
        op.create_index("ix_authsession_user_id", "authsession", ["user_id"])
        op.create_index("ix_authsession_token_hash", "authsession", ["token_hash"], unique=True)
    for table in ("project", "fieldpreset", "cardtypeconfig", "generationrule", "projecttemplate", "cardgeneration"):
        _add_owner(bind, table)
    if not _has_table(bind, "generationjob"):
        op.create_table("generationjob", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False), sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=True), sa.Column("kind", sa.String(), nullable=False), sa.Column("status", sa.String(), nullable=False, server_default="queued"), sa.Column("payload_json", sa.String(), nullable=False, server_default="{}"), sa.Column("result_json", sa.String(), nullable=True), sa.Column("error", sa.String(), nullable=True), sa.Column("current_step", sa.String(), nullable=True), sa.Column("completed_steps", sa.Integer(), nullable=False, server_default="0"), sa.Column("total_steps", sa.Integer(), nullable=False, server_default="1"), sa.Column("cancel_requested", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("started_at", sa.DateTime(), nullable=True), sa.Column("completed_at", sa.DateTime(), nullable=True))
        for col in ("user_id", "project_id", "status"):
            op.create_index(f"ix_generationjob_{col}", "generationjob", [col])
    if not _has_table(bind, "generationstep"):
        op.create_table("generationstep", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("job_id", sa.Integer(), sa.ForeignKey("generationjob.id"), nullable=False), sa.Column("step_key", sa.String(), nullable=False), sa.Column("status", sa.String(), nullable=False, server_default="pending"), sa.Column("content", sa.String(), nullable=False, server_default=""), sa.Column("error", sa.String(), nullable=True), sa.Column("started_at", sa.DateTime(), nullable=True), sa.Column("completed_at", sa.DateTime(), nullable=True))
        op.create_index("ix_generationstep_job_id", "generationstep", ["job_id"])
    if not _has_table(bind, "generationusage"):
        op.create_table("generationusage", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False), sa.Column("job_id", sa.Integer(), sa.ForeignKey("generationjob.id"), nullable=False), sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=True), sa.Column("step_key", sa.String(), nullable=True), sa.Column("model", sa.String(), nullable=False), sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"), sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"), sa.Column("total_tokens", sa.Integer(), nullable=False, server_default="0"), sa.Column("is_estimated", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(), nullable=False))
        for col in ("user_id", "job_id", "project_id", "created_at"):
            op.create_index(f"ix_generationusage_{col}", "generationusage", [col])
    if not _has_table(bind, "projectavatar"):
        op.create_table("projectavatar", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("project_id", sa.Integer(), sa.ForeignKey("project.id"), nullable=False, unique=True), sa.Column("mime_type", sa.String(), nullable=False), sa.Column("content", sa.LargeBinary(), nullable=False), sa.Column("updated_at", sa.DateTime(), nullable=False))
        op.create_index("ix_projectavatar_project_id", "projectavatar", ["project_id"], unique=True)

def downgrade():
    raise RuntimeError("This data-preserving migration is intentionally irreversible")
