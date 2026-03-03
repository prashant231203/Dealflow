/** @type {import('next').NextConfig} */
const nextConfig = {
    // Dealflow backend API routes are in `/app/api`
    // We can build around them cleanly.
    reactStrictMode: true,
    transpilePackages: ['@dealflow/sdk'],
    experimental: {
        optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons', 'cmdk'],
    },
    turbopack: {
        root: process.cwd(),
    },
};

export default nextConfig;
