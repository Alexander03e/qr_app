export const PATHS = {
    CLIENT: "/c",
    OPERATOR: "/o",
    ADMIN: "/a"
}

export const buildRouterPath = (base: string, path: string) => {
    return `${base}/${path}`;
}