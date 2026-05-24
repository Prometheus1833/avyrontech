
-- Public buckets serve files via the public CDN endpoint without needing a SELECT policy
-- on storage.objects. Removing the broad SELECT policies prevents arbitrary clients from
-- listing all files in the bucket while keeping known-path downloads working.
DROP POLICY IF EXISTS "Public read examples" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
