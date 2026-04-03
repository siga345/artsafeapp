-- Preflight required before production rollout:
-- 1. Ensure no user has more than one ACTIVE primary goal.
-- 2. Ensure no track has more than one RELEASE demo.
-- 3. Ensure no demo bucket has duplicate (trackId, versionType, sortIndex).

CREATE UNIQUE INDEX "ArtistGoal_active_primary_user_unique"
ON "ArtistGoal"("userId")
WHERE "status" = 'ACTIVE' AND "isPrimary" = true;

CREATE UNIQUE INDEX "Demo_release_track_unique"
ON "Demo"("trackId")
WHERE "versionType" = 'RELEASE';

CREATE UNIQUE INDEX "Demo_trackId_versionType_sortIndex_key"
ON "Demo"("trackId", "versionType", "sortIndex");
