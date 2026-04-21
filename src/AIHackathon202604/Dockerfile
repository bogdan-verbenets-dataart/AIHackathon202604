FROM mcr.microsoft.com/dotnet/core/sdk:2.2 AS build
WORKDIR /src
COPY ["AIHackathon202604.csproj", "./"]
RUN dotnet restore "./AIHackathon202604.csproj"
COPY . .
RUN dotnet publish "AIHackathon202604.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/core/aspnet:2.2 AS final
WORKDIR /app
EXPOSE 80
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "AIHackathon202604.dll"]
