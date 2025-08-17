using System;
using System.Collections.Generic;

namespace Api.Models
{
    public record PostDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? Excerpt { get; set; }
        public string? CoverImageUrl { get; set; }
        public string[] Tags { get; set; } = Array.Empty<string>();
        public string Status { get; set; } = string.Empty;
        public DateTimeOffset? PublishedAt { get; set; }
    }

    public record ProjectDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public string[] TechStack { get; set; } = Array.Empty<string>();
        public string[] Images { get; set; } = Array.Empty<string>();
        public object? Links { get; set; }
        public bool Featured { get; set; }
        public int SortOrder { get; set; }
    }

    public record ExperienceDto
    {
        public Guid Id { get; set; }
        public string Company { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Location { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Description { get; set; }
        public string[] TechTags { get; set; } = Array.Empty<string>();
        public int SortOrder { get; set; }
    }

    public record EducationDto
    {
        public Guid Id { get; set; }
        public string School { get; set; } = string.Empty;
        public string? Degree { get; set; }
        public string? Field { get; set; }
        public int? StartYear { get; set; }
        public int? EndYear { get; set; }
        public string? Details { get; set; }
        public int SortOrder { get; set; }
    }

    public record SkillDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public int? Level { get; set; }
        public int SortOrder { get; set; }
    }

    public record GalleryItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string[] Tags { get; set; } = Array.Empty<string>();
        public int SortOrder { get; set; }
        public bool Published { get; set; }
    }

    public record ProfileDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Headline { get; set; }
        public string? Bio { get; set; }
        public string? Location { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public string? BannerUrl { get; set; }
        public object? Socials { get; set; }
    }

    public sealed class PagedResult<T>
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public long Total { get; set; }
        public T[] Items { get; set; } = Array.Empty<T>();
    }
}
