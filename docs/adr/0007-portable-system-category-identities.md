# System categories have portable identities

Each System category has an immutable semantic key independent of its database UUID and localized display name. Backups and other portable data formats reference this key so user data can move across deployments without depending on instance-specific IDs or mutable labels, accepting the added schema and seed maintenance.
