from django.db import models

class LandingPageSection(models.Model):
    """
    Flexible Landing Page Sections
    Allows admin to create and reorder different sections
    """
    SECTION_TYPES = (
        ('hero', 'Hero Section'),
        ('features', 'Features Grid'),
        ('text_image', 'Text + Image'),
        ('testimonials', 'Testimonials'),
        ('cta', 'Call to Action'),
        ('faq', 'FAQ Accordion'),
        ('custom', 'Custom HTML'),
    )

    section_type = models.CharField(max_length=20, choices=SECTION_TYPES, default='custom')
    title = models.CharField(max_length=200, blank=True, help_text="Internal title or section header")
    order = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    
    # Content stored as JSON for maximum flexibility
    # Structure depends on section_type:
    # hero: { title_uz, subtitle_uz, bg_image, video_url, cta_text, cta_link }
    # features: [{ icon, title, desc }]
    # text_image: { title, text, image, image_position }
    content = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Landing Page Section"
        verbose_name_plural = "Landing Page Sections"

    def __str__(self):
        return f"{self.get_section_type_display()} - {self.title}"
