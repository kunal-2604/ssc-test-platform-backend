export const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
};

export const getUserAgent = (req) => {
  return req.headers["user-agent"] || "";
};
