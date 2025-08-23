# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
# Copy the whole repo (fast enough; you can optimize later with a two-step copy)
COPY . .
# IMPORTANT: use the path from the build-context root
RUN dotnet restore backend/Api/Api.csproj
RUN dotnet publish backend/Api/Api.csproj -c Release -o /out /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Kestrel will bind to the port your app uses (Program.cs already reads PORT).
# Leaving ASPNETCORE_URLS fixed to 8080 is fine since Program.cs binds correctly,
# but we keep it here to be explicit for local runs.
ENV PORT=8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080

COPY --from=build /out .
EXPOSE 8080
ENTRYPOINT ["dotnet","Api.dll"]
