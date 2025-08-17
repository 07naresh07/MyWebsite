# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore Api.csproj
RUN dotnet publish Api.csproj -c Release -o /out

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
# Render provides $PORT; use it. Local default helps when you test.
ENV PORT=8080
ENV ASPNETCORE_URLS=http://+:$PORT

COPY --from=build /out .
EXPOSE 8080
ENTRYPOINT ["dotnet","Api.dll"]
