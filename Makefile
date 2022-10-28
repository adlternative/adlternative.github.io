CONTENT_DIR = content
TEMPLATE_DIR = templates
HEADFOOT = $(TEMPLATE_DIR)/headfoot.mustache
NONINDEX = $(TEMPLATE_DIR)/nonindex.mustache
MUSTACHE = mustache $(CONTENT_DIR)/$(1) $(TEMPLATE_DIR)/$(2) > $(3)

.NOTPARALLEL:
.PHONY: all clean deploy

all: index.html about.html projects.html contact.html 404.html
	rm -f *.mustache

index.html: $(CONTENT_DIR)/index.yml $(TEMPLATE_DIR)/boxcontent.mustache $(HEADFOOT)
	$(call MUSTACHE,index.yml,boxcontent.mustache,headfootPart.mustache)
	$(call MUSTACHE,index.yml,headfoot.mustache,index.html)

about.html: $(CONTENT_DIR)/about.yml $(TEMPLATE_DIR)/about.mustache $(HEADFOOT) $(NONINDEX)
	$(call MUSTACHE,about.yml,about.mustache,nonindexPart.mustache)
	$(call MUSTACHE,about.yml,nonindex.mustache,headfootPart.mustache)
	$(call MUSTACHE,about.yml,headfoot.mustache,about.html)

projects.html: $(CONTENT_DIR)/projects.yml $(TEMPLATE_DIR)/projects.mustache $(HEADFOOT) $(NONINDEX)
	$(call MUSTACHE,projects.yml,projects.mustache,nonindexPart.mustache)
	$(call MUSTACHE,projects.yml,nonindex.mustache,headfootPart.mustache)
	$(call MUSTACHE,projects.yml,headfoot.mustache,projects.html)

contact.html: $(CONTENT_DIR)/contact.yml $(TEMPLATE_DIR)/contact.mustache $(HEADFOOT) $(NONINDEX)
	$(call MUSTACHE,contact.yml,contact.mustache,nonindexPart.mustache)
	$(call MUSTACHE,contact.yml,nonindex.mustache,headfootPart.mustache)
	$(call MUSTACHE,contact.yml,headfoot.mustache,contact.html)

404.html: $(CONTENT_DIR)/404.yml $(TEMPLATE_DIR)/boxcontent.mustache $(HEADFOOT)
	$(call MUSTACHE,404.yml,boxcontent.mustache,headfootPart.mustache)
	$(call MUSTACHE,404.yml,headfoot.mustache,404.html)

clean:
	rm -f *.html *.mustache
