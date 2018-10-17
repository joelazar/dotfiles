restic -r ~/OneDrive/backup backup ~/.ssh \
                                   ~/Documents \
                                   ~/Pictures \
                                   ~/private \
                                   ~/logs \
                                   ~/notes

# restic -r ~/OneDrive/backup snapshots 
# restic -r ~/OneDrive/backup forget snapshothash
# restic -r ~/OneDrive/backup prune 
