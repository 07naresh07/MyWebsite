// Program.cs (.NET 8 minimal API) — top-level statements ONLY.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.HttpOverrides; // needed for UseForwardedHeaders

using Npgsql;
using NpgsqlTypes;

using Api.Models; // DTOs live in Api/Models/Dtos.cs

// Helps if your DB has legacy timestamp behavior
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// ===== builder =====
var builder = WebApplication.CreateBuilder(args);

// Bind to Render's provided PORT (fallback 8080 for local)
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// So API always emits camelCase JSON (nice for JS)
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

// ===== Config =====
var allowedCsv = builder.Configuration["AllowedOrigin"] ?? "http://localhost:5173";
// Normalize & build an exact-match set (no trailing slashes)
var allowed = allowedCsv
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Select(o => o.TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

// ---- Owner / JWT settings (pull from appsettings **or** env) ----
string? ownerPassFromConfig = builder.Configuration["Owner:Pass"];
string? ownerPassFromEnv    = builder.Configuration["OWNER_PASS"];
var OWNER_PASS_RAW = ownerPassFromConfig ?? ownerPassFromEnv;
var OWNER_PASS = string.IsNullOrWhiteSpace(OWNER_PASS_RAW) ? "owner-dev-pass" : OWNER_PASS_RAW;

string? jwtKeyFromConfig = builder.Configuration["Owner:JwtKey"];
string? jwtKeyFromEnv    = builder.Configuration["JWT_SECRET"];
var JWT_SECRET_RAW = jwtKeyFromConfig ?? jwtKeyFromEnv;
var SECRET = string.IsNullOrWhiteSpace(JWT_SECRET_RAW)
    ? "uS0m5p4d3d-32char-minimum-secret-key-123456"
    : JWT_SECRET_RAW;
if (SECRET.Length < 32) SECRET = SECRET.PadRight(32, '0');

var tokenMinutesCfg = builder.Configuration["Owner:TokenMinutes"];
int tokenMinutes = int.TryParse(tokenMinutesCfg, out var tm) ? tm : 120; // default 2h
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SECRET));

// ===== NEW: environment mode flag for auth handler =====
var isDev = builder.Environment.IsDevelopment();

// ===== CORS / Swagger / Static files =====
var corsPolicyName = "Frontend";

// Build a quick lookup of exact origins from config
var allowedSet = new HashSet<string>(allowed, StringComparer.OrdinalIgnoreCase);

// --- NEW helper: single source of truth for allowed origins (CSV + *.vercel.app) ---
bool IsAllowedOrigin(string? origin)
{
    if (string.IsNullOrWhiteSpace(origin)) return false;
    var normalized = origin.TrimEnd('/');

    if (allowedSet.Contains(normalized)) return true;

    try
    {
        var host = new Uri(normalized).Host;
        if (host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase)) return true;
    }
    catch { /* ignore parse errors */ }

    return false;
}

// CORS: exact-allow list + allow *.vercel.app; send credentials
builder.Services.AddCors(o =>
{
    o.AddPolicy(corsPolicyName, p =>
        p.SetIsOriginAllowed(IsAllowedOrigin)
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()
    );
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDirectoryBrowser();

// ===== HttpClient for safe proxying =====
builder.Services.AddHttpClient("thirdparty")
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        AllowAutoRedirect = true,
        AutomaticDecompression = DecompressionMethods.All
    })
    .SetHandlerLifetime(TimeSpan.FromMinutes(5));

// ===== AuthN/AuthZ =====
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ClockSkew = TimeSpan.FromSeconds(30)
        };

        // Read token from HttpOnly cookie first; allow query token only in Dev
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue("auth", out var cookieToken) &&
                    !string.IsNullOrWhiteSpace(cookieToken))
                {
                    context.Token = cookieToken;
                    return Task.CompletedTask;
                }

                var auth = context.Request.Headers["Authorization"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(auth) &&
                    auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    context.Token = auth.Substring("Bearer ".Length).Trim();
                    return Task.CompletedTask;
                }

                var xTok = context.Request.Headers["X-Owner-Token"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(xTok))
                {
                    context.Token = xTok.Trim();
                    return Task.CompletedTask;
                }

                if (isDev)
                {
                    var q = context.Request.Query["token"].FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(q))
                    {
                        context.Token = q.Trim();
                        return Task.CompletedTask;
                    }
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("Owner", p => p.RequireAssertion(ctx =>
        ctx.User.HasClaim(c => (c.Type == "role" || c.Type == ClaimTypes.Role) && c.Value == "owner")
    ));
});

var app = builder.Build();

// ===== Startup hints =====
try
{
    Console.WriteLine($"[API] ENV: {app.Environment.EnvironmentName}");
    Console.WriteLine($"[API] Allowed Origin(s): {string.Join(", ", allowed)}");
    Console.WriteLine($"[API] Also allowing: *.vercel.app");
    Console.WriteLine($"[API] Owner pass configured: {(!string.IsNullOrWhiteSpace(OWNER_PASS) ? "YES" : "NO")}");
    Console.WriteLine($"[API] JWT key length: {SECRET?.Length ?? 0}");
    Console.WriteLine($"[API] Token lifetime (minutes): {tokenMinutes}");
}
catch { /* ignore */ }

// Honor X-Forwarded-* from Render's proxy so scheme/host are correct
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor
});

// Apply CORS early
app.UseCors(corsPolicyName);

app.UseSwagger();
app.UseSwaggerUI();

// Ensure webroot for uploads
var webroot = app.Environment.WebRootPath;
if (string.IsNullOrWhiteSpace(webroot)) webroot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
Directory.CreateDirectory(webroot);
app.UseStaticFiles();

// --- NEW: make the exception handler also emit CORS headers when returning errors ---
app.UseExceptionHandler(handler =>
{
    handler.Run(async ctx =>
    {
        // Inject CORS headers on error responses so the browser doesn’t hide 500s as CORS issues
        var origin = ctx.Request.Headers["Origin"].FirstOrDefault();
        if (IsAllowedOrigin(origin))
        {
            ctx.Response.Headers["Access-Control-Allow-Origin"] = origin!.TrimEnd('/');
            ctx.Response.Headers["Vary"] = "Origin";
            ctx.Response.Headers["Access-Control-Allow-Credentials"] = "true";
        }

        var feat = ctx.Features.Get<IExceptionHandlerPathFeature>();
        var ex = feat?.Error;
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        ctx.Response.ContentType = "application/json";
        var includeDetail = app.Environment.IsDevelopment();
        await ctx.Response.WriteAsJsonAsync(new
        {
            error = "Internal Server Error",
            path = feat?.Path,
            detail = includeDetail ? ex?.ToString() : null
        });
    });
});

app.UseAuthentication();
app.UseAuthorization();

// Reply OK to preflights (so CORS headers flow)
app.MapMethods("{*any}", new[] { "OPTIONS" }, () => Results.NoContent())
   .RequireCors(corsPolicyName);

// --------------------- Root & Health (single mapping) ---------------------
app.MapGet("/", () => Results.Text("Backend is up 🚀", "text/plain"));
app.MapGet("/healthz", () => Results.Ok(new { status = "ok", time = DateTimeOffset.UtcNow }));

// ===== Connection string =====
string conn = builder.Configuration.GetConnectionString("Default")
    ?? throw new Exception("Missing ConnectionStrings:Default");

// Log DB target
try
{
    var csb = new NpgsqlConnectionStringBuilder(conn);
    Console.WriteLine($"[API] DB Host -> {csb.Host}:{csb.Port}  (Database={csb.Database})");
}
catch { Console.WriteLine("[API] (could not parse connection string)"); }

// --------------------- Utilities ---------------------
static string Slugify(string s)
{
    if (string.IsNullOrWhiteSpace(s)) return Guid.NewGuid().ToString("n");
    var sb = new StringBuilder(s.Trim().ToLowerInvariant());
    for (int i = 0; i < sb.Length; i++)
    {
        var ch = sb[i];
        if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '-') continue;
        sb[i] = '-';
    }
    var slug = Regex.Replace(sb.ToString(), "-{2,}", "-").Trim('-');
    return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("n") : slug;
}

static string ToYearMonth(DateTime dt) => $"{dt:yyyy-MM}";
static string? ToYearMonthOrNull(DateTime? dt) => dt.HasValue ? $"{dt:yyyy-MM}" : null;

// Safe: returns bool instead of throwing
static bool TryParseDateFlexible(string? s, out DateTime result, out string? error)
{
    result = default;
    error = null;
    if (string.IsNullOrWhiteSpace(s)) { error = "Date is required."; return false; }

    if (DateTime.TryParse(s, CultureInfo.InvariantCulture,
        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
    { result = dt; return true; }

    string[] fmts = { "yyyy-MM-dd", "yyyy-MM", "yyyy" };
    foreach (var f in fmts)
        if (DateTime.TryParseExact(s, f, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out dt))
        {
            result = f switch
            {
                "yyyy" => new DateTime(dt.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                "yyyy-MM" => new DateTime(dt.Year, dt.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };
            return true;
        }

    error = "Unsupported date format. Use ISO, yyyy-MM-dd, yyyy-MM, or yyyy.";
    return false;
}

static DateTime? ParseDateFlexibleOrNull(string? s)
{
    if (string.IsNullOrWhiteSpace(s)) return null;
    if (TryParseDateFlexible(s, out var dt, out _)) return dt;
    return null;
}

// Helper to always send non-null text arrays (your schema uses NOT NULL defaults)
static NpgsqlParameter TextArrayParam(string name, string[]? value) =>
    new NpgsqlParameter(name, NpgsqlDbType.Array | NpgsqlDbType.Text) { Value = value ?? Array.Empty<string>() };

// Base64 data URL image saver
async Task<string?> SaveDataUrlImageAsync(string dataUrl, string folderAbs)
{
    var m = Regex.Match(dataUrl ?? "", @"^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$");
    if (!m.Success) return null;
    var mime = m.Groups[1].Value.ToLowerInvariant();
    var b64 = m.Groups[2].Value;
    byte[] bytes;
    try { bytes = Convert.FromBase64String(b64); }
    catch { return null; }

    var ext = mime switch
    {
        "image/png" => ".png",
        "image/jpeg" or "image/jpg" => ".jpg",
        "image/webp" => ".webp",
        "image/gif" => ".gif",
        _ => ".bin"
    };
    Directory.CreateDirectory(folderAbs);
    var name = $"{Guid.NewGuid():n}{ext}";
    var full = Path.Combine(folderAbs, name);
    await File.WriteAllBytesAsync(full, bytes);
    return $"/uploads/{name}";
}

static string ComputeExcerpt(string? html)
{
    if (string.IsNullOrWhiteSpace(html)) return "";
    var txt = Regex.Replace(html, "<.*?>", " ");
    txt = Regex.Replace(txt, "\\s+", " ").Trim();
    return txt.Length <= 240 ? txt : txt[..240] + "…";
}

// === schema helpers: detect columns that may differ across migrations ===
static async Task<string?> ResolveEducationDetailsColumnAsync(NpgsqlConnection db)
{
    const string q = @"
        select column_name
        from information_schema.columns
        where table_schema = current_schema()
          and table_name = 'education'
          and column_name in ('details_html','details');";
    await using var cmd = new NpgsqlCommand(q, db);
    var found = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    await using var rd = await cmd.ExecuteReaderAsync();
    while (await rd.ReadAsync()) found.Add(rd.GetString(0));
    if (found.Contains("details_html")) return "details_html";
    if (found.Contains("details")) return "details";
    return null;
}

static async Task EnsureProjectsColumnsAsync(NpgsqlConnection db)
{
    const string ddl = @"
        alter table if exists projects
            add column if not exists summary_html text,
            add column if not exists links jsonb;";
    await using var cmd = new NpgsqlCommand(ddl, db);
    await cmd.ExecuteNonQueryAsync();
}

static async Task EnsurePostsTableAsync(NpgsqlConnection db)
{
    const string ddl = @"
    create table if not exists posts (
        id uuid primary key,
        title text not null,
        slug text not null unique,
        excerpt text null,
        cover_image_url text null,
        tags text[] not null default '{}',
        status text not null default 'draft',
        published_at timestamptz null,
        body_html text null,
        meta jsonb null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
    );";
    await using var cmd = new NpgsqlCommand(ddl, db);
    await cmd.ExecuteNonQueryAsync();

    var dd2 = @"
        alter table posts
            add column if not exists meta jsonb,
            add column if not exists body_html text,
            add column if not exists excerpt text,
            add column if not exists cover_image_url text,
            add column if not exists tags text[] not null default '{}',
            add column if not exists status text not null default 'draft',
            add column if not exists published_at timestamptz,
            add column if not exists created_at timestamptz not null default now(),
            add column if not exists updated_at timestamptz not null default now();";
    await using var cmd2 = new NpgsqlCommand(dd2, db);
    await cmd2.ExecuteNonQueryAsync();
}

static async Task EnsureCertificatesTableAsync(NpgsqlConnection db)
{
    const string ddl = @"
    create table if not exists certificates (
        id uuid primary key,
        title text not null,
        issuer text null,
        type text null,
        date_month text null,
        credential_id text null,
        credential_url text null,
        image_url text null,
        skills text[] not null default '{}',
        description text null,
        sort_order int not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz null
    );";
    await using var cmd = new NpgsqlCommand(ddl, db);
    await cmd.ExecuteNonQueryAsync();

    var dd2 = @"
        alter table certificates
            add column if not exists skills text[] not null default '{}',
            add column if not exists description text,
            add column if not exists updated_at timestamptz;";
    await using var cmd2 = new NpgsqlCommand(dd2, db);
    await cmd2.ExecuteNonQueryAsync();
}

static async Task EnsureContactMessagesTableAsync(NpgsqlConnection db)
{
    const string ddl = @"
    create table if not exists contact_messages (
        id uuid primary key,
        name text not null,
        email text null,
        message text not null,
        meta jsonb null,
        created_at timestamptz not null default now()
    );";
    await using var cmd = new NpgsqlCommand(ddl, db);
    await cmd.ExecuteNonQueryAsync();
}

// --------------------- Routes ---------------------

// Health (JSON under /api)
app.MapGet("/api/health", () => Results.Json(new { ok = true }))
   .RequireCors(corsPolicyName);

// ---- Auth
app.MapPost("/api/auth/owner", (OwnerLogin body, HttpResponse res) =>
{
    var pass = (body.Pass ?? "").Trim();

    if (string.IsNullOrWhiteSpace(OWNER_PASS))
        return Results.BadRequest("Owner auth not configured. Set Owner:Pass (or OWNER_PASS env).");

    if (!string.Equals(pass, OWNER_PASS, StringComparison.Ordinal))
        return Results.Unauthorized();

    var creds = new SigningCredentials(jwtKey, SecurityAlgorithms.HmacSha256);
    var claims = new[] { new Claim("role", "owner"), new Claim(ClaimTypes.Role, "owner") };
    var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
        claims: claims,
        notBefore: DateTime.UtcNow,
        expires: DateTime.UtcNow.AddMinutes(tokenMinutes),
        signingCredentials: creds);
    var tokenStr = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);

    res.Cookies.Append("auth", tokenStr, new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        Expires = DateTimeOffset.UtcNow.AddMinutes(tokenMinutes),
        IsEssential = true
    });

    return Results.Ok(new { token = tokenStr });
}).RequireCors(corsPolicyName);

app.MapPost("/api/auth/logout", (HttpResponse res) =>
{
    res.Cookies.Delete("auth", new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/"
    });
    return Results.NoContent();
}).RequireCors(corsPolicyName);

app.MapGet("/api/auth/me", (HttpContext ctx) =>
{
    ctx.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
    var user = ctx.User;
    var isOwner = user?.HasClaim(c =>
        (c.Type == "role" || c.Type == ClaimTypes.Role) && c.Value == "owner") ?? false;

    return Results.Ok(new { isOwner });
}).RequireCors(corsPolicyName);

// --------------------- SAFE CERT LINK RESOLVER + PROXY ---------------------
var proxyAllowHosts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "linkedin.com","www.linkedin.com",
    "coursera.org","www.coursera.org"
};

app.MapPost("/api/certificates/resolve", async (CertResolveReq body, IHttpClientFactory cf) =>
{
    if (string.IsNullOrWhiteSpace(body.Url))
        return Results.BadRequest(new { error = "url is required" });

    if (!Uri.TryCreate(body.Url, UriKind.Absolute, out var uri))
        return Results.BadRequest(new { error = "invalid url" });

    if (!proxyAllowHosts.Contains(uri.Host))
        return Results.BadRequest(new { error = "host not allowed" });

    var http = cf.CreateClient("thirdparty");
    using var req = new HttpRequestMessage(HttpMethod.Get, uri);
    req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; PortfolioBot/1.0)");
    req.Headers.Accept.ParseAdd("*/*");

    try
    {
        using var res = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead);
        var ct = res.Content.Headers.ContentType?.ToString();
        var len = res.Content.Headers.ContentLength;
        return Results.Ok(new
        {
            ok = res.IsSuccessStatusCode,
            status = (int)res.StatusCode,
            finalUrl = res.RequestMessage?.RequestUri?.ToString(),
            contentType = ct,
            contentLength = len
        });
    }
    catch (HttpRequestException ex)
    {
        return Results.Ok(new { ok = false, status = (int)HttpStatusCode.BadGateway, error = ex.Message });
    }
}).RequireCors(corsPolicyName);

app.MapGet("/api/certificates/proxy", async (HttpContext ctx, string url, IHttpClientFactory cf) =>
{
    if (string.IsNullOrWhiteSpace(url)) return Results.BadRequest(new { error = "url is required" });
    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return Results.BadRequest(new { error = "invalid url" });
    if (!proxyAllowHosts.Contains(uri.Host)) return Results.BadRequest(new { error = "host not allowed" });

    var http = cf.CreateClient("thirdparty");
    using var req = new HttpRequestMessage(HttpMethod.Get, uri);
    req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; PortfolioBot/1.0)");
    req.Headers.Accept.ParseAdd("*/*");

    try
    {
        var upstream = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted);
        var ct = upstream.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
        var stream = await upstream.Content.ReadAsStreamAsync(ctx.RequestAborted);
        ctx.Response.Headers["Cache-Control"] = "public, max-age=600";
        return Results.Stream(stream, ct, enableRangeProcessing: false);
    }
    catch (HttpRequestException ex)
    {
        return Results.Problem(statusCode: 502, title: "Upstream fetch failed", detail: ex.Message);
    }
}).RequireCors(corsPolicyName);

// --------------------- POSTS (public + owner CRUD) ---------------------
app.MapGet("/api/posts", async (int page = 1, int pageSize = 10, string? tag = null) =>
{
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 50);
    int offset = (page - 1) * pageSize;

    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsurePostsTableAsync(db);

    var where = "where status = 'published'";
    if (!string.IsNullOrWhiteSpace(tag)) where += " and (tags @> ARRAY[@tag]::text[])";

    var dataSql = $@"
        select id, title, slug, excerpt, cover_image_url, tags, status, published_at,
               body_html as content
        from posts
        {where}
        order by published_at desc nulls last, created_at desc
        limit @limit offset @offset;";

    var countSql = $@"select count(*) from posts {where};";

    long total;
    await using (var countCmd = new NpgsqlCommand(countSql, db))
    {
        if (!string.IsNullOrWhiteSpace(tag)) countCmd.Parameters.AddWithValue("tag", tag!);
        var scalar = await countCmd.ExecuteScalarAsync();
        total = Convert.ToInt64(scalar ?? 0);
    }

    await using var dataCmd = new NpgsqlCommand(dataSql, db);
    dataCmd.Parameters.AddWithValue("limit", pageSize);
    dataCmd.Parameters.AddWithValue("offset", offset);
    if (!string.IsNullOrWhiteSpace(tag)) dataCmd.Parameters.AddWithValue("tag", tag!);

    await using var reader = await dataCmd.ExecuteReaderAsync();
    var items = new List<PostDto>();
    while (await reader.ReadAsync()) items.Add(Helpers.ReadPost(reader));

    return Results.Json(new PagedResult<PostDto>
    {
        Page = page, PageSize = pageSize, Total = total, Items = items.ToArray()
    });
}).RequireCors(corsPolicyName);

app.MapGet("/api/posts/{slug}", async (string slug) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsurePostsTableAsync(db);

    const string sql = "select * from posts where slug = @slug limit 1;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("slug", slug);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound(new { error = "Not found" });
    return Results.Json(Helpers.ReadPost(reader));
}).RequireCors(corsPolicyName);

app.MapPost("/api/posts", [Authorize(Policy = "Owner")] async (PostUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsurePostsTableAsync(db);

    var id = Guid.NewGuid();
    var title = (body.Title ?? "").Trim();
    if (string.IsNullOrWhiteSpace(title)) return Results.BadRequest(new { error = "Title is required" });

    var slug = string.IsNullOrWhiteSpace(body.Slug) ? Slugify(title) : Slugify(body.Slug!);

    var status = string.IsNullOrWhiteSpace(body.Status) ? "draft" : body.Status!.Trim().ToLowerInvariant();
    DateTimeOffset? pub = null;
    if (!string.IsNullOrWhiteSpace(body.PublishedAt))
    {
        if (DateTimeOffset.TryParse(body.PublishedAt, out var po)) pub = po;
        else if (DateTime.TryParse(body.PublishedAt, out var pd)) pub = new DateTimeOffset(pd);
    }

    var excerpt = !string.IsNullOrWhiteSpace(body.Excerpt) ? body.Excerpt : ComputeExcerpt(body.BodyHtml);

    const string sql = @"
        insert into posts (id, title, slug, excerpt, cover_image_url, tags, status, published_at, body_html, meta, created_at, updated_at)
        values (@id, @title, @slug, @excerpt, @cover, @tags, @status, @published_at, @body_html, @meta, now(), now())
        returning *;";

    try
    {
        await using var cmd = new NpgsqlCommand(sql, db);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("title", title);
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("excerpt", (object?)excerpt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cover", (object?)body.CoverImageUrl ?? DBNull.Value);
        cmd.Parameters.Add(TextArrayParam("tags", body.Tags));
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.AddWithValue("published_at", (object?)pub ?? DBNull.Value);
        cmd.Parameters.AddWithValue("body_html", (object?)body.BodyHtml ?? DBNull.Value);
        var pMeta = new NpgsqlParameter("meta", NpgsqlDbType.Jsonb)
        { Value = body.Meta is null ? (object)DBNull.Value : JsonSerializer.Serialize(body.Meta) };
        cmd.Parameters.Add(pMeta);

        await using var rd = await cmd.ExecuteReaderAsync();
        await rd.ReadAsync();
        return Results.Json(Helpers.ReadPost(rd));
    }
    catch (PostgresException pex) when (pex.SqlState == "23505")
    {
        return Results.Conflict(new { error = "Slug already exists." });
    }
}).RequireCors(corsPolicyName);

app.MapPut("/api/posts/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id, PostUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsurePostsTableAsync(db);

    var title = (body.Title ?? "").Trim();
    if (string.IsNullOrWhiteSpace(title)) return Results.BadRequest(new { error = "Title is required" });

    var slug = string.IsNullOrWhiteSpace(body.Slug) ? Slugify(title) : Slugify(body.Slug!);

    var status = string.IsNullOrWhiteSpace(body.Status) ? "draft" : body.Status!.Trim().ToLowerInvariant();
    DateTimeOffset? pub = null;
    if (!string.IsNullOrWhiteSpace(body.PublishedAt))
    {
        if (DateTimeOffset.TryParse(body.PublishedAt, out var po)) pub = po;
        else if (DateTime.TryParse(body.PublishedAt, out var pd)) pub = new DateTimeOffset(pd);
    }

    var excerpt = !string.IsNullOrWhiteSpace(body.Excerpt) ? body.Excerpt : ComputeExcerpt(body.BodyHtml);

    const string sql = @"
        update posts set
            title=@title, slug=@slug, excerpt=@excerpt, cover_image_url=@cover, tags=@tags,
            status=@status, published_at=@published_at, body_html=@body_html, meta=@meta,
            updated_at=now()
        where id=@id
        returning *;";

    try
    {
        await using var cmd = new NpgsqlCommand(sql, db);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("title", title);
        cmd.Parameters.AddWithValue("slug", slug);
        cmd.Parameters.AddWithValue("excerpt", (object?)excerpt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("cover", (object?)body.CoverImageUrl ?? DBNull.Value);
        cmd.Parameters.Add(TextArrayParam("tags", body.Tags));
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.AddWithValue("published_at", (object?)pub ?? DBNull.Value);
        cmd.Parameters.AddWithValue("body_html", (object?)body.BodyHtml ?? DBNull.Value);
        var pMeta = new NpgsqlParameter("meta", NpgsqlDbType.Jsonb)
        { Value = body.Meta is null ? (object)DBNull.Value : JsonSerializer.Serialize(body.Meta) };
        cmd.Parameters.Add(pMeta);

        await using var rd = await cmd.ExecuteReaderAsync();
        if (!await rd.ReadAsync()) return Results.NotFound(new { error = "Not found" });
        return Results.Json(Helpers.ReadPost(rd));
    }
    catch (PostgresException pex) when (pex.SqlState == "23505")
    {
        return Results.Conflict(new { error = "Slug already exists." });
    }
}).RequireCors(corsPolicyName);

app.MapDelete("/api/posts/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsurePostsTableAsync(db);

    const string sql = "delete from posts where id=@id;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    var n = await cmd.ExecuteNonQueryAsync();
    return n == 0 ? Results.NotFound(new { error = "Not found" }) : Results.NoContent();
}).RequireCors(corsPolicyName);

// --------------------- PROJECTS ---------------------
app.MapGet("/api/projects", async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureProjectsColumnsAsync(db);

    const string sql = @"
        select
            id, name, slug,
            summary_html as summary,
            tech_stack, images,
            coalesce(links, '{}'::jsonb) as links,
            featured, sort_order
        from projects
        order by sort_order asc, name asc;";
    await using var cmd = new NpgsqlCommand(sql, db);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<ProjectDto>();
    while (await reader.ReadAsync()) items.Add(Helpers.ReadProject(reader));
    return Results.Json(items);
}).RequireCors(corsPolicyName);

app.MapPost("/api/projects", [Authorize(Policy = "Owner")] async (ProjectUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureProjectsColumnsAsync(db);

    var id = Guid.NewGuid();
    var finalSlug = string.IsNullOrWhiteSpace(body.Slug) ? Slugify(body.Name ?? "") : body.Slug;

    const string sql = @"
        insert into projects
            (id, name, slug, summary_html, tech_stack, images, links, featured, sort_order)
        values
            (@id, @name, @slug, @summary_html, @tech_stack, @images, @links, @featured, @sort_order)
        returning
            id, name, slug, summary_html as summary, tech_stack, images, coalesce(links,'{}'::jsonb) as links, featured, sort_order;";

    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("name", body.Name ?? string.Empty);
    cmd.Parameters.AddWithValue("slug", (object?)finalSlug ?? DBNull.Value);
    cmd.Parameters.AddWithValue("summary_html", (object?)body.Summary ?? DBNull.Value);
    cmd.Parameters.Add(TextArrayParam("tech_stack", body.TechStack));
    cmd.Parameters.Add(TextArrayParam("images", body.Images));
    var pLinks = new NpgsqlParameter("links", NpgsqlDbType.Jsonb)
    { Value = body.Links is null ? (object)DBNull.Value : JsonSerializer.Serialize(body.Links) };
    cmd.Parameters.Add(pLinks);
    cmd.Parameters.AddWithValue("featured", body.Featured);
    cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.BadRequest("Insert failed");
    var created = Helpers.ReadProject(reader);
    return Results.Created($"/api/projects/{created.Id}", created);
}).RequireCors(corsPolicyName);

app.MapPut("/api/projects/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id, ProjectUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureProjectsColumnsAsync(db);

    var finalSlug = string.IsNullOrWhiteSpace(body.Slug) ? Slugify(body.Name ?? "") : body.Slug;

    const string sql = @"
        update projects set
            name = @name,
            slug = @slug,
            summary_html = @summary_html,
            tech_stack = @tech_stack,
            images = @images,
            links = @links,
            featured = @featured,
            sort_order = @sort_order
        where id = @id
        returning id, name, slug, summary_html as summary, tech_stack, images, coalesce(links,'{}'::jsonb) as links, featured, sort_order;";

    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("name", body.Name ?? string.Empty);
    cmd.Parameters.AddWithValue("slug", (object?)finalSlug ?? DBNull.Value);
    cmd.Parameters.AddWithValue("summary_html", (object?)body.Summary ?? DBNull.Value);
    cmd.Parameters.Add(TextArrayParam("tech_stack", body.TechStack));
    cmd.Parameters.Add(TextArrayParam("images", body.Images));
    var pLinks = new NpgsqlParameter("links", NpgsqlDbType.Jsonb)
    { Value = body.Links is null ? (object)DBNull.Value : JsonSerializer.Serialize(body.Links) };
    cmd.Parameters.Add(pLinks);
    cmd.Parameters.AddWithValue("featured", body.Featured);
    cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound(new { error = "Not found" });
    var updated = Helpers.ReadProject(reader);
    return Results.Ok(updated);
}).RequireCors(corsPolicyName);

app.MapDelete("/api/projects/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    const string sql = "delete from projects where id = @id;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);

    var count = await cmd.ExecuteNonQueryAsync();
    return count == 0 ? Results.NotFound(new { error = "Not found" }) : Results.NoContent();
}).RequireCors(corsPolicyName);

// --------------------- PROFILE ---------------------
app.MapGet("/api/profile", async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    const string sql = @"
        select id, full_name, headline, bio, location, email, phone, avatar_url, banner_url, socials
        from profile
        order by id asc
        limit 1;";
    await using var cmd = new NpgsqlCommand(sql, db);
    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.Json((ProfileDto?)null);
    return Results.Json(Helpers.ReadProfile(reader));
}).RequireCors(corsPolicyName);

app.MapPut("/api/profile", [Authorize(Policy = "Owner")] async (ProfileUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    Guid? id = null;
    object? currentSocials = null;
    const string sel = @"select id, socials from profile order by id asc limit 1;";
    await using (var selCmd = new NpgsqlCommand(sel, db))
    await using (var rd = await selCmd.ExecuteReaderAsync())
    {
        if (await rd.ReadAsync())
        {
            id = rd.GetGuid(0);
            currentSocials = Helpers.ReadJsonValue(rd, "socials");
        }
    }

    var toObj = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
    try
    {
        if (currentSocials is JsonElement je && je.ValueKind == JsonValueKind.Object)
        {
            foreach (var p in je.EnumerateObject())
                toObj[p.Name] = p.Value.Deserialize<object?>();
        }
        else if (currentSocials is string s && !string.IsNullOrWhiteSpace(s))
        {
            var parsed = JsonSerializer.Deserialize<JsonElement>(s);
            if (parsed.ValueKind == JsonValueKind.Object)
                foreach (var p in parsed.EnumerateObject())
                    toObj[p.Name] = p.Value.Deserialize<object?>();
        }
    }
    catch { toObj.Clear(); }

    var extras = new
    {
        interests = body.Interests ?? Array.Empty<string>(),
        languages = body.Languages ?? Array.Empty<object>(),
        focus = body.Focus ?? Array.Empty<string>(),
        motto = body.Motto ?? ""
    };
    toObj["extras"] = extras;
    var socialsJson = JsonSerializer.Serialize(toObj);

    if (id == null)
    {
        const string ins = @"
            insert into profile (id, full_name, headline, bio, avatar_url, socials)
            values (@id, @name, @headline, @bio, @avatar, @socials::jsonb)
            returning id, full_name, headline, bio, location, email, phone, avatar_url, banner_url, socials;";
        var newId = Guid.NewGuid();
        await using var cmd = new NpgsqlCommand(ins, db);
        cmd.Parameters.AddWithValue("id", newId);
        cmd.Parameters.AddWithValue("name", body.FullName ?? "");
        cmd.Parameters.AddWithValue("headline", (object?)(body.Quote ?? "") ?? DBNull.Value);
        cmd.Parameters.AddWithValue("bio", (object?)(body.About ?? "") ?? DBNull.Value);
        cmd.Parameters.AddWithValue("avatar", (object?)(body.AvatarUrl ?? "") ?? DBNull.Value);
        var pSocialsIns = new NpgsqlParameter("socials", NpgsqlDbType.Jsonb) { Value = (object?)socialsJson ?? DBNull.Value };
        cmd.Parameters.Add(pSocialsIns);

        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        return Results.Json(Helpers.ReadProfile(reader));
    }
    else
    {
        const string upd = @"
            update profile set
                full_name  = @name,
                headline   = @headline,
                bio        = @bio,
                avatar_url = @avatar,
                socials    = @socials::jsonb
            where id = @id
            returning id, full_name, headline, bio, location, email, phone, avatar_url, banner_url, socials;";
        await using var cmd = new NpgsqlCommand(upd, db);
        cmd.Parameters.AddWithValue("id", id.Value);
        cmd.Parameters.AddWithValue("name", body.FullName ?? "");
        cmd.Parameters.AddWithValue("headline", (object?)(body.Quote ?? "") ?? DBNull.Value);
        cmd.Parameters.AddWithValue("bio", (object?)(body.About ?? "") ?? DBNull.Value);
        cmd.Parameters.AddWithValue("avatar", (object?)(body.AvatarUrl ?? "") ?? DBNull.Value);
        var pSocialsUpd = new NpgsqlParameter("socials", NpgsqlDbType.Jsonb) { Value = (object?)socialsJson ?? DBNull.Value };
        cmd.Parameters.Add(pSocialsUpd);

        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();
        return Results.Json(Helpers.ReadProfile(reader));
    }
}).RequireCors(corsPolicyName);

// Upload avatar -> { url } in /uploads
app.MapPost("/api/upload/profile-image", [Authorize(Policy = "Owner")] async (HttpRequest req) =>
{
    if (!req.HasFormContentType) return Results.BadRequest("multipart/form-data required.");
    var form = await req.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file is null || file.Length == 0) return Results.BadRequest("No file.");

    var uploads = Path.Combine(webroot!, "uploads");
    Directory.CreateDirectory(uploads);
    var ext = Path.GetExtension(file.FileName);
    var name = $"{Guid.NewGuid():n}{ext}";
    var full = Path.Combine(uploads, name);
    await using (var fs = System.IO.File.OpenWrite(full))
        await file.CopyToAsync(fs);

    var publicUrl = $"/uploads/{name}";
    return Results.Ok(new { url = publicUrl });
}).RequireCors(corsPolicyName);

// --------------------- EXPERIENCE ---------------------
app.MapGet("/api/experience", async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    const string sql = @"
        select
            id, company, role, location,
            start_date, end_date,
            description_html as description,
            tech_tags, sort_order
        from experience
        order by sort_order asc, start_date desc nulls last;";
    await using var cmd = new NpgsqlCommand(sql, db);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<ExperienceDto>();
    while (await reader.ReadAsync()) items.Add(Helpers.ReadExperience(reader));
    return Results.Json(items);
}).RequireCors(corsPolicyName);

app.MapPost("/api/experience", [Authorize(Policy = "Owner")] async (ExperienceUpsertReq body) =>
{
    if (!TryParseDateFlexible(body.StartDate, out var start, out var err))
        return Results.BadRequest(new { error = $"startDate: {err}" });

    var end = ParseDateFlexibleOrNull(body.EndDate);
    if (!string.IsNullOrWhiteSpace(body.EndDate) && end == null)
        return Results.BadRequest(new { error = "endDate: Unsupported date format. Use ISO, yyyy-MM-dd, yyyy-MM, or yyyy." });

    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    var id = Guid.NewGuid();
    string startYm = ToYearMonth(start);
    string? endYm = ToYearMonthOrNull(end);

    const string sql = @"
        insert into experience
            (id, company, role, location,
             start_ym, end_ym, start_date, end_date,
             description_html, tech_tags, sort_order)
        values
            (@id, @company, @role, @location,
             @start_ym, @end_ym, @start_date, @end_date,
             @description_html, @tech_tags, @sort_order)
        returning
            id, company, role, location, start_date, end_date,
            description_html as description, tech_tags, sort_order;";

    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("company", body.Company ?? string.Empty);
    cmd.Parameters.AddWithValue("role", body.Role ?? string.Empty);
    cmd.Parameters.AddWithValue("location", (object?)body.Location ?? DBNull.Value);
    cmd.Parameters.AddWithValue("start_ym", startYm);
    cmd.Parameters.AddWithValue("end_ym", (object?)endYm ?? DBNull.Value);
    cmd.Parameters.AddWithValue("start_date", (object?)start ?? DBNull.Value);
    cmd.Parameters.AddWithValue("end_date", (object?)end ?? DBNull.Value);
    cmd.Parameters.AddWithValue("description_html", (object?)body.Description ?? DBNull.Value);
    cmd.Parameters.Add(TextArrayParam("tech_tags", body.TechTags));
    cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.BadRequest("Insert failed");
    var created = Helpers.ReadExperience(reader);
    return Results.Created($"/api/experience/{created.Id}", created);
}).RequireCors(corsPolicyName);

app.MapPut("/api/experience/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id, ExperienceUpsertReq body) =>
{
    if (!TryParseDateFlexible(body.StartDate, out var start, out var err))
        return Results.BadRequest(new { error = $"startDate: {err}" });

    var end = ParseDateFlexibleOrNull(body.EndDate);
    if (!string.IsNullOrWhiteSpace(body.EndDate) && end == null)
        return Results.BadRequest(new { error = "endDate: Unsupported date format. Use ISO, yyyy-MM-dd, yyyy-MM, or yyyy." });

    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    string startYm = ToYearMonth(start);
    string? endYm = ToYearMonthOrNull(end);

    const string sql = @"
        update experience set
            company = @company,
            role = @role,
            location = @location,
            start_ym = @start_ym,
            end_ym = @end_ym,
            start_date = @start_date,
            end_date = @end_date,
            description_html = @description_html,
            tech_tags = @tech_tags,
            sort_order = @sort_order
        where id = @id
        returning
            id, company, role, location, start_date, end_date,
            description_html as description, tech_tags, sort_order;";

    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("company", body.Company ?? string.Empty);
    cmd.Parameters.AddWithValue("role", body.Role ?? string.Empty);
    cmd.Parameters.AddWithValue("location", (object?)body.Location ?? DBNull.Value);
    cmd.Parameters.AddWithValue("start_ym", startYm);
    cmd.Parameters.AddWithValue("end_ym", (object?)endYm ?? DBNull.Value);
    cmd.Parameters.AddWithValue("start_date", (object?)start ?? DBNull.Value);
    cmd.Parameters.AddWithValue("end_date", (object?)end ?? DBNull.Value);
    cmd.Parameters.AddWithValue("description_html", (object?)body.Description ?? DBNull.Value);
    cmd.Parameters.Add(TextArrayParam("tech_tags", body.TechTags));
    cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound(new { error = "Not found" });
    var updated = Helpers.ReadExperience(reader);
    return Results.Ok(updated);
}).RequireCors(corsPolicyName);

app.MapDelete("/api/experience/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    const string sql = "delete from experience where id = @id;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);

    var count = await cmd.ExecuteNonQueryAsync();
    return count == 0 ? Results.NotFound(new { error = "Not found" }) : Results.NoContent();
}).RequireCors(corsPolicyName);

// --------------------- EDUCATION (schema-flexible) ---------------------
app.MapGet("/api/education", async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    var detailsCol = await ResolveEducationDetailsColumnAsync(db);
    string selectDetails = detailsCol is null ? "NULL::text as details" : $"{detailsCol} as details";

    var sql = $@"
        select
            id, school, degree, field,
            start_year, end_year,
            {selectDetails},
            sort_order
        from education
        order by
            sort_order asc,
            coalesce(end_year, 9999) desc,
            coalesce(start_year, 0) desc;";

    await using var cmd = new NpgsqlCommand(sql, db);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<EducationDto>();
    while (await reader.ReadAsync()) items.Add(Helpers.ReadEducation(reader));
    return Results.Json(items);
}).RequireCors(corsPolicyName);

app.MapPost("/api/education", [Authorize(Policy = "Owner")] async (EducationUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    var detailsCol = await ResolveEducationDetailsColumnAsync(db);
    if (detailsCol is null)
    {
        const string sqlNoDetails = @"
            insert into education
                (id, school, degree, field, start_year, end_year, sort_order)
            values
                (@id, @school, @degree, @field, @start_year, @end_year, @sort_order)
            returning
                id, school, degree, field, start_year, end_year, NULL::text as details, sort_order;";
        var id = Guid.NewGuid();
        await using var cmd = new NpgsqlCommand(sqlNoDetails, db);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("school", body.School ?? string.Empty);
        cmd.Parameters.AddWithValue("degree", (object?)body.Degree ?? DBNull.Value);
        cmd.Parameters.AddWithValue("field", (object?)body.Field ?? DBNull.Value);
        cmd.Parameters.AddWithValue("start_year", (object?)body.StartYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("end_year", (object?)body.EndYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return Results.BadRequest("Insert failed");
        var created = Helpers.ReadEducation(reader);
        return Results.Created($"/api/education/{created.Id}", created);
    }
    else
    {
        var id = Guid.NewGuid();
        var sql = $@"
            insert into education
                (id, school, degree, field, start_year, end_year, {detailsCol}, sort_order)
            values
                (@id, @school, @degree, @field, @start_year, @end_year, @details, @sort_order)
            returning
                id, school, degree, field, start_year, end_year, {detailsCol} as details, sort_order;";

        await using var cmd = new NpgsqlCommand(sql, db);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("school", body.School ?? string.Empty);
        cmd.Parameters.AddWithValue("degree", (object?)body.Degree ?? DBNull.Value);
        cmd.Parameters.AddWithValue("field", (object?)body.Field ?? DBNull.Value);
        cmd.Parameters.AddWithValue("start_year", (object?)body.StartYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("end_year", (object?)body.EndYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("details", (object?)body.Details ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return Results.BadRequest("Insert failed");
        var created = Helpers.ReadEducation(reader);
        return Results.Created($"/api/education/{created.Id}", created);
    }
}).RequireCors(corsPolicyName);

app.MapPut("/api/education/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id, EducationUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    var detailsCol = await ResolveEducationDetailsColumnAsync(db);
    if (detailsCol is null)
    {
        const string sqlNoDetails = @"
            update education set
                school = @school,
                degree = @degree,
                field = @field,
                start_year = @start_year,
                end_year = @end_year,
                sort_order = @sort_order
            where id = @id
            returning
                id, school, degree, field, start_year, end_year, NULL::text as details, sort_order;";
        await using var cmd = new NpgsqlCommand(sqlNoDetails, db);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("school", body.School ?? string.Empty);
        cmd.Parameters.AddWithValue("degree", (object?)body.Degree ?? DBNull.Value);
        cmd.Parameters.AddWithValue("field", (object?)body.Field ?? DBNull.Value);
        cmd.Parameters.AddWithValue("start_year", (object?)body.StartYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("end_year", (object?)body.EndYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return Results.NotFound(new { error = "Not found" });
        var updated = Helpers.ReadEducation(reader);
        return Results.Ok(updated);
    }
    else
    {
        var sql = $@"
            update education set
                school = @school,
                degree = @degree,
                field = @field,
                start_year = @start_year,
                end_year = @end_year,
                {detailsCol} = @details,
                sort_order = @sort_order
            where id = @id
            returning
                id, school, degree, field, start_year, end_year, {detailsCol} as details, sort_order;";
        await using var cmd = new NpgsqlCommand(sql, db);
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("school", body.School ?? string.Empty);
        cmd.Parameters.AddWithValue("degree", (object?)body.Degree ?? DBNull.Value);
        cmd.Parameters.AddWithValue("field", (object?)body.Field ?? DBNull.Value);
        cmd.Parameters.AddWithValue("start_year", (object?)body.StartYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("end_year", (object?)body.EndYear ?? DBNull.Value);
        cmd.Parameters.AddWithValue("details", (object?)body.Details ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return Results.NotFound(new { error = "Not found" });
        var updated = Helpers.ReadEducation(reader);
        return Results.Ok(updated);
    }
}).RequireCors(corsPolicyName);

app.MapDelete("/api/education/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    const string sql = "delete from education where id = @id;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);

    var affected = await cmd.ExecuteNonQueryAsync();
    return affected == 0
        ? Results.NotFound(new { error = "Not found" })
        : Results.NoContent();
}).RequireCors(corsPolicyName);

// --------------------- SKILLS ---------------------
app.MapMethods("/api/skills", new[] { "GET", "OPTIONS" }, async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    const string sql = @"
        select id, name, category, level, sort_order
        from skills
        order by sort_order asc, name asc;";
    await using var cmd = new NpgsqlCommand(sql, db);
    await using var rd = await cmd.ExecuteReaderAsync();
    var items = new List<SkillDto>();
    while (await rd.ReadAsync()) items.Add(Helpers.ReadSkill(rd));
    return Results.Json(items);
}).RequireCors(corsPolicyName);

app.MapPost("/api/skills", [Authorize(Policy = "Owner")] async (SkillUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    var id = Guid.NewGuid();

    const string sql = @"
        insert into skills (id, name, category, level, sort_order)
        values (@id, @name, @category, @level, @sort)
        returning id, name, category, level, sort_order;";

    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("name", body.Name ?? "");
    cmd.Parameters.AddWithValue("category", (object?)body.Category ?? DBNull.Value);
    cmd.Parameters.AddWithValue("level", (object?)body.Level ?? DBNull.Value);
    cmd.Parameters.AddWithValue("sort", body.SortOrder);

    await using var rd = await cmd.ExecuteReaderAsync();
    await rd.ReadAsync();
    return Results.Json(Helpers.ReadSkill(rd));
}).RequireCors(corsPolicyName);

app.MapPut("/api/skills/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id, SkillUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    const string sql = @"
        update skills set
            name=@name, category=@category, level=@level, sort_order=@sort
        where id=@id
        returning id, name, category, level, sort_order;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("name", body.Name ?? "");
    cmd.Parameters.AddWithValue("category", (object?)body.Category ?? DBNull.Value);
    cmd.Parameters.AddWithValue("level", (object?)body.Level ?? DBNull.Value);
    cmd.Parameters.AddWithValue("sort", body.SortOrder);
    await using var rd = await cmd.ExecuteReaderAsync();
    if (!await rd.ReadAsync()) return Results.NotFound();
    return Results.Json(Helpers.ReadSkill(rd));
}).RequireCors(corsPolicyName);

app.MapDelete("/api/skills/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    const string sql = "delete from skills where id=@id;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    var n = await cmd.ExecuteNonQueryAsync();
    return n == 0 ? Results.NotFound() : Results.NoContent();
}).RequireCors(corsPolicyName);

// --------------------- LANGUAGES (optional table) ---------------------
app.MapGet("/api/languages", async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();

    const string sql = @"
        select id, name, code, level_cefr, proficiency_pct, is_primary, notes, sort_order
        from languages
        order by is_primary desc, sort_order asc, name asc;";
    await using var cmd = new NpgsqlCommand(sql, db);
    await using var rd = await cmd.ExecuteReaderAsync();

    var items = new List<object>();
    while (await rd.ReadAsync())
    {
        items.Add(new
        {
            Id = rd.GetGuid(0),
            Name = rd.GetString(1),
            Code = rd.IsDBNull(2) ? null : rd.GetString(2),
            LevelCEFR = rd.IsDBNull(3) ? null : rd.GetString(3),
            ProficiencyPct = rd.IsDBNull(4) ? (int?)null : rd.GetInt32(4),
            IsPrimary = rd.GetBoolean(5),
            Notes = rd.IsDBNull(6) ? null : rd.GetString(6),
            SortOrder = rd.GetInt32(7)
        });
    }
    return Results.Json(items);
}).RequireCors(corsPolicyName);

// --------------------- CERTIFICATES ---------------------
app.MapGet("/api/certificates", async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureCertificatesTableAsync(db);

    const string sql = @"
        select id, title, issuer, type, date_month, credential_id, credential_url,
               image_url, skills, description, sort_order, created_at, updated_at
        from certificates
        order by sort_order asc, created_at desc;";
    await using var cmd = new NpgsqlCommand(sql, db);
    await using var rd = await cmd.ExecuteReaderAsync();

    var items = new List<object>();
    while (await rd.ReadAsync())
    {
        items.Add(new
        {
            Id = rd.GetGuid(0),
            Title = rd.GetString(1),
            Issuer = rd.IsDBNull(2) ? null : rd.GetString(2),
            Type = rd.IsDBNull(3) ? null : rd.GetString(3),
            DateMonth = rd.IsDBNull(4) ? null : rd.GetString(4),
            CredentialId = rd.IsDBNull(5) ? null : rd.GetString(5),
            CredentialUrl = rd.IsDBNull(6) ? null : rd.GetString(6),
            ImageUrl = rd.IsDBNull(7) ? null : rd.GetString(7),
            Skills = Helpers.ReadStringArraySafe(rd, "skills"),
            Description = rd.IsDBNull(9) ? null : rd.GetString(9),
            SortOrder = rd.GetInt32(10),
            CreatedAt = Helpers.ReadDateTimeOffsetSafe(rd, "created_at"),
            UpdatedAt = Helpers.ReadDateTimeOffsetSafe(rd, "updated_at"),
        });
    }
    return Results.Json(items);
}).RequireCors(corsPolicyName);

// --------------------- GALLERY compatibility (maps to certificates) --------
app.MapGet("/api/gallery", async () =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureCertificatesTableAsync(db);

    const string sql = @"
        select
            id,
            title,
            coalesce(issuer,'') || case when date_month is not null then ' • '||date_month else '' end as description,
            image_url,
            '{}'::text[] as tags,
            sort_order,
            true as published
        from certificates
        order by sort_order asc, created_at desc;";
    await using var cmd = new NpgsqlCommand(sql, db);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<GalleryItemDto>();
    while (await reader.ReadAsync()) items.Add(Helpers.ReadGallery(reader));
    return Results.Json(items);
}).RequireCors(corsPolicyName);

app.MapPost("/api/gallery", [Authorize(Policy = "Owner")] async (CertificateUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureCertificatesTableAsync(db);

    var id = Guid.NewGuid();
    var uploads = Path.Combine(webroot!, "uploads");
    string? imageUrl = body.ImageUrl;

    var dataUrl = !string.IsNullOrWhiteSpace(body.Image) ? body.Image! :
                  (!string.IsNullOrWhiteSpace(body.ImageUrl) && body.ImageUrl!.StartsWith("data:image/") ? body.ImageUrl! : null);
    if (!string.IsNullOrWhiteSpace(dataUrl))
        imageUrl = await SaveDataUrlImageAsync(dataUrl!, uploads) ?? imageUrl;

    const string sql = @"
        insert into certificates
            (id, title, issuer, type, date_month, credential_id, credential_url, image_url, skills, description, sort_order, created_at, updated_at)
        values
            (@id, @title, @issuer, @type, @date_month, @cred_id, @cred_url, @image_url, @skills, @description, @sort_order, now(), now())
        returning id;";

    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("title", body.Title ?? "");
    cmd.Parameters.AddWithValue("issuer", (object?)body.Issuer ?? DBNull.Value);
    cmd.Parameters.AddWithValue("type", (object?)body.Type ?? DBNull.Value);
    cmd.Parameters.AddWithValue("date_month", (object?)body.DateMonth ?? DBNull.Value);
    cmd.Parameters.AddWithValue("cred_id", (object?)body.CredentialId ?? DBNull.Value);
    cmd.Parameters.AddWithValue("cred_url", (object?)body.CredentialUrl ?? DBNull.Value);
    cmd.Parameters.AddWithValue("image_url", (object?)imageUrl ?? DBNull.Value);
    cmd.Parameters.Add(TextArrayParam("skills", body.Skills));
    cmd.Parameters.AddWithValue("description", (object?)body.Description ?? DBNull.Value);
    cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

    await cmd.ExecuteScalarAsync();
    return Results.Created($"/api/gallery/{id}", new { id, imageUrl });
}).RequireCors(corsPolicyName);

app.MapPut("/api/gallery/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id, CertificateUpsertReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureCertificatesTableAsync(db);

    var uploads = Path.Combine(webroot!, "uploads");
    string? imageUrl = body.ImageUrl;

    var dataUrl = !string.IsNullOrWhiteSpace(body.Image) ? body.Image! :
                  (!string.IsNullOrWhiteSpace(body.ImageUrl) && body.ImageUrl!.StartsWith("data:image/") ? body.ImageUrl! : null);
    if (!string.IsNullOrWhiteSpace(dataUrl))
        imageUrl = await SaveDataUrlImageAsync(dataUrl!, uploads) ?? imageUrl;

    const string sql = @"
        update certificates set
            title=@title, issuer=@issuer, type=@type, date_month=@date_month,
            credential_id=@cred_id, credential_url=@cred_url, image_url=@image_url,
            skills=@skills, description=@description, sort_order=@sort_order, updated_at=now()
        where id=@id
        returning id;";

    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("title", body.Title ?? "");
    cmd.Parameters.AddWithValue("issuer", (object?)body.Issuer ?? DBNull.Value);
    cmd.Parameters.AddWithValue("type", (object?)body.Type ?? DBNull.Value);
    cmd.Parameters.AddWithValue("date_month", (object?)body.DateMonth ?? DBNull.Value);
    cmd.Parameters.AddWithValue("cred_id", (object?)body.CredentialId ?? DBNull.Value);
    cmd.Parameters.AddWithValue("cred_url", (object?)body.CredentialUrl ?? DBNull.Value);
    cmd.Parameters.AddWithValue("image_url", (object?)imageUrl ?? DBNull.Value);
    cmd.Parameters.Add(TextArrayParam("skills", body.Skills));
    cmd.Parameters.AddWithValue("description", (object?)body.Description ?? DBNull.Value);
    cmd.Parameters.AddWithValue("sort_order", body.SortOrder);

    var obj = await cmd.ExecuteScalarAsync();
    if (obj is null) return Results.NotFound(new { error = "Not found" });
    return Results.Ok(new { id, imageUrl });
}).RequireCors(corsPolicyName);

app.MapDelete("/api/gallery/{id:guid}", [Authorize(Policy = "Owner")] async (Guid id) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureCertificatesTableAsync(db);

    const string sql = "delete from certificates where id=@id;";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    var n = await cmd.ExecuteNonQueryAsync();
    return n == 0 ? Results.NotFound(new { error = "Not found" }) : Results.NoContent();
}).RequireCors(corsPolicyName);

// --------------------- CONTACT form ---------------------
app.MapPost("/contact", async (ContactReq body) =>
{
    await using var db = new NpgsqlConnection(conn);
    await db.OpenAsync();
    await EnsureContactMessagesTableAsync(db);

    var id = Guid.NewGuid();
    const string sql = @"
        insert into contact_messages (id, name, email, message, meta)
        values (@id, @name, @email, @message, @meta);";
    await using var cmd = new NpgsqlCommand(sql, db);
    cmd.Parameters.AddWithValue("id", id);
    cmd.Parameters.AddWithValue("name", (body.Name ?? "").Trim());
    cmd.Parameters.AddWithValue("email", (object?)(body.Email ?? "").Trim() ?? DBNull.Value);
    cmd.Parameters.AddWithValue("message", (body.Message ?? "").Trim());
    var pMeta = new NpgsqlParameter("meta", NpgsqlDbType.Jsonb)
    { Value = body.Meta is null ? (object)DBNull.Value : JsonSerializer.Serialize(body.Meta) };
    cmd.Parameters.Add(pMeta);
    await cmd.ExecuteNonQueryAsync();

    return Results.Ok(new { ok = true });
}).RequireCors(corsPolicyName);

app.Run();

// --------------------- Request body records ---------------------
record OwnerLogin(string Pass);

public record ProjectUpsertReq(
    string? Name,
    string? Slug,
    string? Summary,
    string[]? TechStack,
    string[]? Images,
    object? Links,
    bool Featured = false,
    int SortOrder = 0
);

public record EducationUpsertReq(
    string School,
    string? Degree,
    string? Field,
    int? StartYear,
    int? EndYear,
    string? Details,
    int SortOrder = 0
);

public record ExperienceUpsertReq(
    string Company,
    string Role,
    string? Location,
    string StartDate,
    string? EndDate,
    string? Description,
    string[]? TechTags,
    int SortOrder = 0
);

public record ProfileUpsertReq(
    string? FullName,
    string? Quote,
    string? AvatarUrl,
    string? About,
    string[]? Interests,
    object[]? Languages,
    string[]? Focus,
    string? Motto
);

public record SkillUpsertReq(
    string? Name,
    string? Category,
    int? Level,
    int SortOrder = 0
);

public record CertResolveReq(string Url);

public record CertificateUpsertReq(
    string? Title,
    string? Issuer,
    string? Type,
    string? DateMonth,
    string? CredentialId,
    string? CredentialUrl,
    string? ImageUrl,    // url or data URL
    string? Image,       // data URL optional
    string[]? Skills,
    string? Description,
    int SortOrder = 0
);

public record PostUpsertReq(
    string? Title,
    string? Slug,
    string? BodyHtml,
    string[]? Tags,
    string? Excerpt,
    string? CoverImageUrl,
    string? Status,
    string? PublishedAt,
    object? Meta
);

public record ContactReq(
    string? Name,
    string? Email,
    string? Message,
    object? Meta
);

// --------------------- Helpers ---------------------
static class Helpers
{
    public static string[] ReadStringArraySafe(NpgsqlDataReader r, string col)
    {
        var i = r.GetOrdinal(col);
        if (r.IsDBNull(i)) return Array.Empty<string>();

        var pv = r.GetProviderSpecificValue(i);
        if (pv is string[] a1) return a1;

        if (pv is string s)
        {
            try { return JsonSerializer.Deserialize<string[]>(s) ?? Array.Empty<string>(); }
            catch { }
        }

        try
        {
            if (pv is object[] oa)
                return oa.Select(x => x?.ToString() ?? "").Where(x => x.Length > 0).ToArray();
        }
        catch { }

        return Array.Empty<string>();
    }

    public static DateTimeOffset? ReadDateTimeOffsetSafe(NpgsqlDataReader r, string col)
    {
        var i = r.GetOrdinal(col);
        if (r.IsDBNull(i)) return null;
        try { return r.GetFieldValue<DateTimeOffset>(i); } catch { }
        try
        {
            var dt = r.GetFieldValue<DateTime>(i);
            return new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc));
        }
        catch { }
        return null;
    }

    public static object? ReadJsonValue(NpgsqlDataReader r, string col)
    {
        var i = r.GetOrdinal(col);
        if (r.IsDBNull(i)) return null;
        try
        {
            var s = r.GetString(i);
            return JsonSerializer.Deserialize<object>(s);
        }
        catch
        {
            return r.GetValue(i);
        }
    }

    public static PostDto ReadPost(NpgsqlDataReader r) => new()
    {
        Id = r.GetGuid(r.GetOrdinal("id")),
        Title = r.GetString(r.GetOrdinal("title")),
        Slug = r.GetString(r.GetOrdinal("slug")),
        Excerpt = r.IsDBNull(r.GetOrdinal("excerpt")) ? null : r.GetString(r.GetOrdinal("excerpt")),
        CoverImageUrl = r.IsDBNull(r.GetOrdinal("cover_image_url")) ? null : r.GetString(r.GetOrdinal("cover_image_url")),
        Tags = ReadStringArraySafe(r, "tags"),
        Status = r.GetString(r.GetOrdinal("status")),
        PublishedAt = ReadDateTimeOffsetSafe(r, "published_at")
    };

    public static ProjectDto ReadProject(NpgsqlDataReader r) => new()
    {
        Id = r.GetGuid(r.GetOrdinal("id")),
        Name = r.GetString(r.GetOrdinal("name")),
        Slug = (r.IsDBNull(r.GetOrdinal("slug")) ? null : r.GetString(r.GetOrdinal("slug"))) ?? string.Empty,
        Summary = r.IsDBNull(r.GetOrdinal("summary")) ? null : r.GetString(r.GetOrdinal("summary")),
        TechStack = ReadStringArraySafe(r, "tech_stack"),
        Images = ReadStringArraySafe(r, "images"),
        Links = ReadJsonValue(r, "links"),
        Featured = r.IsDBNull(r.GetOrdinal("featured")) ? false : r.GetBoolean(r.GetOrdinal("featured")),
        SortOrder = r.IsDBNull(r.GetOrdinal("sort_order")) ? 0 : r.GetInt32(r.GetOrdinal("sort_order")),
    };

    public static ProfileDto ReadProfile(NpgsqlDataReader r) => new()
    {
        Id = r.GetGuid(r.GetOrdinal("id")),
        FullName = r.GetString(r.GetOrdinal("full_name")),
        Headline = r.IsDBNull(r.GetOrdinal("headline")) ? null : r.GetString(r.GetOrdinal("headline")),
        Bio = r.IsDBNull(r.GetOrdinal("bio")) ? null : r.GetString(r.GetOrdinal("bio")),
        Location = r.IsDBNull(r.GetOrdinal("location")) ? null : r.GetString(r.GetOrdinal("location")),
        Email = r.IsDBNull(r.GetOrdinal("email")) ? null : r.GetString(r.GetOrdinal("email")),
        Phone = r.IsDBNull(r.GetOrdinal("phone")) ? null : r.GetString(r.GetOrdinal("phone")),
        AvatarUrl = r.IsDBNull(r.GetOrdinal("avatar_url")) ? null : r.GetString(r.GetOrdinal("avatar_url")),
        BannerUrl = r.IsDBNull(r.GetOrdinal("banner_url")) ? null : r.GetString(r.GetOrdinal("banner_url")),
        Socials = ReadJsonValue(r, "socials")
    };

    public static ExperienceDto ReadExperience(NpgsqlDataReader r) => new()
    {
        Id = r.GetGuid(r.GetOrdinal("id")),
        Company = r.GetString(r.GetOrdinal("company")),
        Role = r.GetString(r.GetOrdinal("role")),
        Location = r.IsDBNull(r.GetOrdinal("location")) ? null : r.GetString(r.GetOrdinal("location")),
        StartDate = r.IsDBNull(r.GetOrdinal("start_date")) ? DateTime.MinValue : r.GetDateTime(r.GetOrdinal("start_date")),
        EndDate = r.IsDBNull(r.GetOrdinal("end_date")) ? (DateTime?)null : r.GetDateTime(r.GetOrdinal("end_date")),
        Description = r.IsDBNull(r.GetOrdinal("description")) ? null : r.GetString(r.GetOrdinal("description")),
        TechTags = ReadStringArraySafe(r, "tech_tags"),
        SortOrder = r.GetInt32(r.GetOrdinal("sort_order"))
    };

    public static EducationDto ReadEducation(NpgsqlDataReader r) => new()
    {
        Id = r.GetGuid(r.GetOrdinal("id")),
        School = r.GetString(r.GetOrdinal("school")),
        Degree = r.IsDBNull(r.GetOrdinal("degree")) ? null : r.GetString(r.GetOrdinal("degree")),
        Field = r.IsDBNull(r.GetOrdinal("field")) ? null : r.GetString(r.GetOrdinal("field")),
        StartYear = r.IsDBNull(r.GetOrdinal("start_year")) ? (int?)null : r.GetInt32(r.GetOrdinal("start_year")),
        EndYear = r.IsDBNull(r.GetOrdinal("end_year")) ? (int?)null : r.GetInt32(r.GetOrdinal("end_year")),
        Details = r.IsDBNull(r.GetOrdinal("details")) ? null : r.GetString(r.GetOrdinal("details")),
        SortOrder = r.GetInt32(r.GetOrdinal("sort_order"))
    };

    public static SkillDto ReadSkill(NpgsqlDataReader r) => new()
    {
        Id = r.GetGuid(r.GetOrdinal("id")),
        Name = r.GetString(r.GetOrdinal("name")),
        Category = r.IsDBNull(r.GetOrdinal("category")) ? null : r.GetString(r.GetOrdinal("category")),
        Level = r.IsDBNull(r.GetOrdinal("level")) ? (int?)null : r.GetInt32(r.GetOrdinal("level")),
        SortOrder = r.GetInt32(r.GetOrdinal("sort_order"))
    };

    public static GalleryItemDto ReadGallery(NpgsqlDataReader r) => new()
    {
        Id = r.GetGuid(r.GetOrdinal("id")),
        Title = r.GetString(r.GetOrdinal("title")),
        Description = r.IsDBNull(r.GetOrdinal("description")) ? null : r.GetString(r.GetOrdinal("description")),
        ImageUrl = r.IsDBNull(r.GetOrdinal("image_url")) ? "" : r.GetString(r.GetOrdinal("image_url")),
        Tags = ReadStringArraySafe(r, "tags"),
        SortOrder = r.GetInt32(r.GetOrdinal("sort_order")),
        Published = r.GetBoolean(r.GetOrdinal("published"))
    };
}
