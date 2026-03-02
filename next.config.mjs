/** @type {import('next').NextConfig} */
const nextConfig = {
    // Dealflow backend API routes are in `/app/api`
    // We can build around them cleanly.
    reactStrictMode: true,
    transpilePackages: ['@dealflow/sdk'],
};

export default nextConfig;
